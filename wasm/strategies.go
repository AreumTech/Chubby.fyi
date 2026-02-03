package main

import (
	"fmt"
	"math"
	"sort"
)

// StrategyProcessor handles advanced financial strategy implementations
type StrategyProcessor struct {
	taxCalculator   *TaxCalculator
	cashManager     *CashManager
	washSalePeriods map[AssetClass]int // Track wash sale periods by asset class
}

// NewStrategyProcessor creates a new strategy processor
func NewStrategyProcessor(taxCalc *TaxCalculator, cashMgr *CashManager) *StrategyProcessor {
	return &StrategyProcessor{
		taxCalculator:   taxCalc,
		cashManager:     cashMgr,
		washSalePeriods: make(map[AssetClass]int),
	}
}

// ProcessAssetAllocationStrategy implements sophisticated asset allocation
func (sp *StrategyProcessor) ProcessAssetAllocationStrategy(
	accounts *AccountHoldingsMonthEnd,
	strategy AssetAllocationStrategy,
	currentMonth int,
	currentAge int,
	targetRetirementAge int,
) error {
	switch strategy.StrategyType {
	case "fixed":
		return sp.processFixedAllocation(accounts, strategy, currentMonth)
	case "age_based":
		return sp.processAgeBased(accounts, strategy, currentMonth, currentAge)
	case "glide_path":
		return sp.processGlidePath(accounts, strategy, currentMonth, currentAge, targetRetirementAge)
	default:
		return fmt.Errorf("unknown allocation strategy: %s", strategy.StrategyType)
	}
}

// processFixedAllocation implements fixed percentage allocation
func (sp *StrategyProcessor) processFixedAllocation(
	accounts *AccountHoldingsMonthEnd,
	strategy AssetAllocationStrategy,
	currentMonth int,
) error {
	totalValue := sp.calculateTotalPortfolioValue(accounts)
	if totalValue <= 0 {
		return nil
	}

	// Calculate target allocations
	targetValues := make(map[AssetClass]float64)
	for assetClass, percentage := range strategy.Allocations {
		targetValues[assetClass] = totalValue * percentage
	}

	// Check if rebalancing is needed
	needsRebalancing, deviations := sp.checkRebalancingNeeded(accounts, targetValues, strategy.RebalanceThreshold)
	if !needsRebalancing {
		return nil
	}

	// Execute rebalancing with tax awareness
	return sp.executeRebalancing(accounts, targetValues, deviations, currentMonth)
}

// processAgeBased implements age-based allocation (e.g., 110 - age rule for stock percentage)
func (sp *StrategyProcessor) processAgeBased(
	accounts *AccountHoldingsMonthEnd,
	strategy AssetAllocationStrategy,
	currentMonth int,
	currentAge int,
) error {
	// Use externalized age-based strategy parameters from configuration
	ageRule, maxStock, minStock, domesticProportion, intlProportion := GetAgeBasedStrategyParams()

	// Calculate target stock percentage based on age
	stockPercentage := math.Max(0.0, math.Min(1.0, float64(ageRule-currentAge)/100.0))

	// Apply configured min/max bounds for stability
	if stockPercentage > maxStock {
		stockPercentage = maxStock
	}
	if stockPercentage < minStock {
		stockPercentage = minStock
	}

	bondPercentage := 1.0 - stockPercentage

	// Create dynamic allocation based on age using configured proportions
	dynamicStrategy := AssetAllocationStrategy{
		StrategyType:       "fixed",
		RebalanceThreshold: strategy.RebalanceThreshold, // Preserve original threshold
		Allocations: map[AssetClass]float64{
			AssetClassUSStocksTotalMarket:  stockPercentage * domesticProportion,  // Configured domestic proportion
			AssetClassInternationalStocks:  stockPercentage * intlProportion,     // Configured international proportion
			AssetClassUSBondsTotalMarket:   bondPercentage,                       // Remaining in bonds
		},
	}

	simLogVerbose("AGE-BASED ALLOCATION: Age %d → %d%% stocks (%d%% domestic, %d%% intl), %d%% bonds",
		currentAge,
		int(stockPercentage*100),
		int(stockPercentage*domesticProportion*100),
		int(stockPercentage*intlProportion*100),
		int(bondPercentage*100))

	// Execute the calculated allocation using existing fixed allocation logic
	return sp.processFixedAllocation(accounts, dynamicStrategy, currentMonth)
}

// processGlidePath implements target-date fund style glide path
func (sp *StrategyProcessor) processGlidePath(
	accounts *AccountHoldingsMonthEnd,
	strategy AssetAllocationStrategy,
	currentMonth int,
	currentAge int,
	targetRetirementAge int,
) error {
	// Use externalized glide path brackets from configuration
	brackets := GetGlidePathBrackets()

	// Calculate years to retirement based on current age and target retirement age
	yearsToRetirement := math.Max(0, float64(targetRetirementAge - currentAge))

	// Find appropriate bracket based on years to retirement
	var stockPercentage float64
	var domesticProportion float64
	var intlProportion float64

	// Find the matching bracket
	found := false
	for _, bracket := range brackets {
		if yearsToRetirement >= float64(bracket.YearsToRetirementMin) {
			stockPercentage = bracket.StockPercentage
			domesticProportion = bracket.DomesticStockProportion
			intlProportion = bracket.InternationalStockProportion
			found = true
			break
		}
	}

	// If no bracket found (should not happen with proper config), use the last (most conservative) bracket
	if !found && len(brackets) > 0 {
		lastBracket := brackets[len(brackets)-1]
		stockPercentage = lastBracket.StockPercentage
		domesticProportion = lastBracket.DomesticStockProportion
		intlProportion = lastBracket.InternationalStockProportion
	}

	bondPercentage := 1.0 - stockPercentage

	// Create dynamic allocation strategy using configured proportions
	dynamicStrategy := AssetAllocationStrategy{
		StrategyType:       "fixed",
		RebalanceThreshold: strategy.RebalanceThreshold, // Preserve original threshold
		Allocations: map[AssetClass]float64{
			AssetClassUSStocksTotalMarket: stockPercentage * domesticProportion,  // Configured domestic proportion
			AssetClassInternationalStocks: stockPercentage * intlProportion,     // Configured international proportion
			AssetClassUSBondsTotalMarket:  bondPercentage,                       // Remaining in bonds
		},
	}

	simLogVerbose("GLIDE PATH ALLOCATION: Age %d, %d years to retirement → %d%% stocks (%d%% domestic, %d%% intl), %d%% bonds",
		currentAge,
		int(yearsToRetirement),
		int(stockPercentage*100),
		int(stockPercentage*domesticProportion*100),
		int(stockPercentage*intlProportion*100),
		int(bondPercentage*100))

	// Execute the calculated allocation using existing fixed allocation logic
	return sp.processFixedAllocation(accounts, dynamicStrategy, currentMonth)
}

// ProcessRebalancing implements sophisticated portfolio rebalancing
func (sp *StrategyProcessor) ProcessRebalancing(
	accounts *AccountHoldingsMonthEnd,
	params RebalancingParameters,
	assetAllocation AssetAllocationStrategy,
	assetLocation AssetLocationPreferences,
	currentMonth int,
) error {
	switch params.Method {
	case "threshold":
		return sp.processThresholdRebalancing(accounts, params, assetAllocation, currentMonth)
	case "periodic":
		return sp.processPeriodicRebalancing(accounts, params, assetAllocation, currentMonth)
	case "hybrid":
		return sp.processHybridRebalancing(accounts, params, assetAllocation, currentMonth)
	default:
		return fmt.Errorf("unknown rebalancing method: %s", params.Method)
	}
}

// processThresholdRebalancing rebalances when allocations drift beyond threshold
func (sp *StrategyProcessor) processThresholdRebalancing(
	accounts *AccountHoldingsMonthEnd,
	params RebalancingParameters,
	allocation AssetAllocationStrategy,
	currentMonth int,
) error {
	totalValue := sp.calculateTotalPortfolioValue(accounts)
	if totalValue <= 0 {
		return nil
	}

	// Calculate target values
	targetValues := make(map[AssetClass]float64)
	for assetClass, percentage := range allocation.Allocations {
		targetValues[assetClass] = totalValue * percentage
	}

	// Check if rebalancing threshold is breached
	needsRebalancing, deviations := sp.checkRebalancingNeeded(accounts, targetValues, params.ThresholdPercentage)
	if !needsRebalancing {
		return nil
	}

	return sp.executeRebalancing(accounts, targetValues, deviations, currentMonth)
}

// processPeriodicRebalancing rebalances on a schedule regardless of drift
func (sp *StrategyProcessor) processPeriodicRebalancing(
	accounts *AccountHoldingsMonthEnd,
	params RebalancingParameters,
	allocation AssetAllocationStrategy,
	currentMonth int,
) error {
	// Check if it's time to rebalance based on frequency
	shouldRebalance := false
	switch params.Frequency {
	case "monthly":
		shouldRebalance = true
	case "quarterly":
		shouldRebalance = currentMonth%3 == 0
	case "annually":
		shouldRebalance = currentMonth%12 == 0
	}

	if !shouldRebalance {
		return nil
	}

	totalValue := sp.calculateTotalPortfolioValue(accounts)
	if totalValue <= 0 {
		return nil
	}

	targetValues := make(map[AssetClass]float64)
	for assetClass, percentage := range allocation.Allocations {
		targetValues[assetClass] = totalValue * percentage
	}

	_, deviations := sp.checkRebalancingNeeded(accounts, targetValues, 0) // Always rebalance on schedule
	return sp.executeRebalancing(accounts, targetValues, deviations, currentMonth)
}

// processHybridRebalancing combines threshold and periodic approaches
func (sp *StrategyProcessor) processHybridRebalancing(
	accounts *AccountHoldingsMonthEnd,
	params RebalancingParameters,
	allocation AssetAllocationStrategy,
	currentMonth int,
) error {
	// Try threshold-based first
	err := sp.processThresholdRebalancing(accounts, params, allocation, currentMonth)
	if err != nil {
		return err
	}

	// Also check periodic schedule for forced rebalancing
	return sp.processPeriodicRebalancing(accounts, params, allocation, currentMonth)
}

// ProcessTaxLossHarvesting implements advanced tax-loss harvesting
func (sp *StrategyProcessor) ProcessTaxLossHarvesting(
	accounts *AccountHoldingsMonthEnd,
	settings TaxLossHarvestingSettings,
	currentMonth int,
) (LotSaleResult, error) {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0),
		SaleTransactions: make([]SaleTransaction, 0),
	}

	if !settings.Enabled || accounts.Taxable == nil {
		return result, nil
	}

	// Find loss harvesting opportunities
	taxableAccount := accounts.Taxable
	candidates := sp.identifyLossHarvestingCandidates(taxableAccount, settings, currentMonth)
	if len(candidates) == 0 {
		return result, nil
	}

	// Sort by potential loss amount (largest losses first)
	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].PotentialLoss > candidates[j].PotentialLoss
	})

	// Execute harvesting with annual limit consideration
	totalLossHarvested := 0.0
	for _, candidate := range candidates {
		if totalLossHarvested >= settings.MaxAnnualLossHarvest {
			break
		}

		remainingAllowance := settings.MaxAnnualLossHarvest - totalLossHarvested
		lossToHarvest := math.Min(candidate.PotentialLoss, remainingAllowance)

		if lossToHarvest >= settings.MinimumLossThreshold {
			// Calculate sale amount needed to realize this loss
			sellAmount := (lossToHarvest / candidate.PotentialLoss) * candidate.CurrentValue

			// Execute sale with wash sale awareness
			saleResult := sp.executeTaxLossHarvestingSale(taxableAccount, candidate, sellAmount, currentMonth)

			// Merge results
			sp.cashManager.mergeSaleResults(&result, saleResult)
			totalLossHarvested += math.Abs(saleResult.TotalRealizedGains)

			// Set wash sale period
			sp.setWashSalePeriod(accounts, candidate.AssetClass, currentMonth, settings.WashSaleAvoidancePeriod)
		}
	}

	// Save modified account back
	accounts.Taxable = taxableAccount
	return result, nil
}

// ProcessStrategicCapitalGains implements strategic capital gains realization
func (sp *StrategyProcessor) ProcessStrategicCapitalGains(
	accounts *AccountHoldingsMonthEnd,
	settings StrategicCapitalGainsSettings,
	taxContext AdvancedTaxContext,
	currentMonth int,
) (LotSaleResult, error) {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0),
		SaleTransactions: make([]SaleTransaction, 0),
	}

	if !settings.Enabled || accounts.Taxable == nil {
		return result, nil
	}

	// Calculate available LTCG tax bracket space
	availableGainCapacity := sp.calculateLTCGCapacity(taxContext, settings.TargetTaxBracket)
	if availableGainCapacity <= 0 {
		return result, nil
	}

	// Find gain realization opportunities
	taxableAccount := accounts.Taxable
	candidates := sp.identifyGainRealizationCandidates(taxableAccount, settings, currentMonth)
	if len(candidates) == 0 {
		return result, nil
	}

	// Sort by tax efficiency (prefer long-term gains, higher gain amounts)
	sort.Slice(candidates, func(i, j int) bool {
		if candidates[i].IsLongTerm != candidates[j].IsLongTerm {
			return candidates[i].IsLongTerm // Prefer long-term gains
		}
		return candidates[i].PotentialGain > candidates[j].PotentialGain
	})

	// Execute strategic gain realization
	totalGainsRealized := 0.0
	targetGains := math.Min(availableGainCapacity, settings.MaxGainsPerYear)

	for _, candidate := range candidates {
		if totalGainsRealized >= targetGains {
			break
		}

		remainingCapacity := targetGains - totalGainsRealized
		gainToRealize := math.Min(candidate.PotentialGain, remainingCapacity)

		if gainToRealize >= settings.MinGainThreshold {
			// Calculate sale amount needed
			sellAmount := (gainToRealize / candidate.PotentialGain) * candidate.CurrentValue

			// Execute sale
			saleResult := sp.executeStrategicGainsSale(taxableAccount, candidate, sellAmount, currentMonth)

			// Merge results
			sp.cashManager.mergeSaleResults(&result, saleResult)
			totalGainsRealized += saleResult.TotalRealizedGains
		}
	}

	// Save modified account back
	accounts.Taxable = taxableAccount
	return result, nil
}

// ProcessCashManagement implements automated cash management
func (sp *StrategyProcessor) ProcessCashManagement(
	accounts *AccountHoldingsMonthEnd,
	strategy CashManagementStrategy,
	monthlyExpenses float64,
	currentMonth int,
) error {
	// Calculate target cash reserve
	targetCash := strategy.TargetReserveAmount
	if strategy.TargetReserveMonths > 0 {
		targetCash = math.Max(targetCash, strategy.TargetReserveMonths*monthlyExpenses)
	}

	currentCash := accounts.Cash

	if currentCash < targetCash && strategy.AutoSellForShortfall {
		// Need to sell assets to meet cash target
		shortfall := targetCash - currentCash
		return sp.sellAssetsForCash(accounts, shortfall, currentMonth)
	} else if currentCash > targetCash*1.5 && strategy.AutoInvestExcess {
		// Have excess cash to invest
		excess := currentCash - targetCash
		return sp.investExcessCash(accounts, excess, currentMonth)
	}

	return nil
}

// ProcessDebtManagement implements strategic debt management
func (sp *StrategyProcessor) ProcessDebtManagement(
	accounts *AccountHoldingsMonthEnd,
	liabilities []Liability,
	strategy DebtManagementStrategy,
	currentMonth int,
) error {
	if strategy.ExtraPaymentAmount <= 0 {
		return nil
	}

	switch strategy.Method {
	case "avalanche":
		return sp.processDebtAvalanche(accounts, liabilities, strategy, currentMonth)
	case "snowball":
		return sp.processDebtSnowball(accounts, liabilities, strategy, currentMonth)
	case "custom":
		return sp.processCustomDebtPayment(accounts, liabilities, strategy, currentMonth)
	default:
		return fmt.Errorf("unknown debt management method: %s", strategy.Method)
	}
}

// Helper functions implementation

func (sp *StrategyProcessor) calculateTotalPortfolioValue(accounts *AccountHoldingsMonthEnd) float64 {
	total := accounts.Cash

	if accounts.Taxable != nil {
		taxableAccount := accounts.Taxable
		total += taxableAccount.TotalValue
	}
	if accounts.TaxDeferred != nil {
		taxDeferredAccount := accounts.TaxDeferred
		total += taxDeferredAccount.TotalValue
	}
	if accounts.Roth != nil {
		rothAccount := accounts.Roth
		total += rothAccount.TotalValue
	}

	return total
}

func (sp *StrategyProcessor) checkRebalancingNeeded(
	accounts *AccountHoldingsMonthEnd,
	targetValues map[AssetClass]float64,
	threshold float64,
) (bool, map[AssetClass]float64) {
	currentValues := sp.getCurrentAssetValues(accounts)
	deviations := make(map[AssetClass]float64)
	maxDeviation := 0.0

	for assetClass, targetValue := range targetValues {
		currentValue := currentValues[assetClass]
		deviation := math.Abs(currentValue - targetValue)
		deviations[assetClass] = deviation

		if targetValue > 0 {
			relativeDeviation := deviation / targetValue
			if relativeDeviation > maxDeviation {
				maxDeviation = relativeDeviation
			}
		}
	}

	return maxDeviation > threshold, deviations
}

func (sp *StrategyProcessor) getCurrentAssetValues(accounts *AccountHoldingsMonthEnd) map[AssetClass]float64 {
	values := make(map[AssetClass]float64)

	accountSlice := []*Account{accounts.Taxable, accounts.TaxDeferred, accounts.Roth}
	for _, account := range accountSlice {
		if account == nil {
			continue
		}

		for _, holding := range account.Holdings {
			values[holding.AssetClass] += holding.CurrentMarketValueTotal
		}
	}

	values[AssetClassCash] = accounts.Cash
	return values
}

func (sp *StrategyProcessor) executeRebalancing(
	accounts *AccountHoldingsMonthEnd,
	targetValues map[AssetClass]float64,
	deviations map[AssetClass]float64,
	currentMonth int,
) error {
	// Implementation would involve complex selling and buying to reach targets
	// This is a simplified version

	currentValues := sp.getCurrentAssetValues(accounts)

	// Determine which assets to sell (over-allocated) and buy (under-allocated)
	toSell := make(map[AssetClass]float64)
	toBuy := make(map[AssetClass]float64)

	// DETERMINISM FIX: Sort asset classes for consistent iteration order
	// Go maps have non-deterministic iteration order, which causes different
	// sell/buy sequences between runs with the same seed
	sortedAssetClasses := getSortedAssetClasses(targetValues)

	for _, assetClass := range sortedAssetClasses {
		targetValue := targetValues[assetClass]
		currentValue := currentValues[assetClass]
		difference := currentValue - targetValue

		if difference > 0 {
			toSell[assetClass] = difference
		} else if difference < 0 {
			toBuy[assetClass] = -difference
		}
	}

	// Execute sales first to generate cash (sorted for determinism)
	sortedSellClasses := getSortedAssetClasses(toSell)
	for _, assetClass := range sortedSellClasses {
		sellAmount := toSell[assetClass]
		if assetClass != AssetClassCash {
			err := sp.sellSpecificAssetClass(accounts, assetClass, sellAmount, currentMonth)
			if err != nil {
				return fmt.Errorf("failed to sell %s: %v", assetClass, err)
			}
		}
	}

	// Execute purchases with generated cash (sorted for determinism)
	sortedBuyClasses := getSortedAssetClasses(toBuy)
	for _, assetClass := range sortedBuyClasses {
		buyAmount := toBuy[assetClass]
		if assetClass != AssetClassCash && accounts.Cash >= buyAmount {
			err := sp.buySpecificAssetClass(accounts, assetClass, buyAmount, currentMonth)
			if err != nil {
				return fmt.Errorf("failed to buy %s: %v", assetClass, err)
			}
		}
	}

	return nil
}

// getSortedAssetClasses returns asset classes from a map in deterministic sorted order
func getSortedAssetClasses(m map[AssetClass]float64) []AssetClass {
	keys := make([]AssetClass, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool {
		return string(keys[i]) < string(keys[j])
	})
	return keys
}

// Real trading implementations required for strategy processing
func (sp *StrategyProcessor) sellSpecificAssetClass(accounts *AccountHoldingsMonthEnd, assetClass AssetClass, amount float64, currentMonth int) error {
	// Use existing CashManager functionality for tax-efficient FIFO selling
	result := sp.cashManager.SellSpecificAssetClassFIFO(accounts, assetClass, amount, currentMonth)

	// Add the proceeds to cash
	accounts.Cash += result.TotalProceeds

	simLogVerbose("SELL: %s %.2f -> $%.2f proceeds (%.2f gains)",
		assetClass, amount, result.TotalProceeds, result.ShortTermGains + result.LongTermGains)

	return nil
}

func (sp *StrategyProcessor) buySpecificAssetClass(accounts *AccountHoldingsMonthEnd, assetClass AssetClass, amount float64, currentMonth int) error {
	// Check if sufficient cash is available
	if accounts.Cash < amount {
		return fmt.Errorf("insufficient cash for purchase: need $%.2f, have $%.2f", amount, accounts.Cash)
	}

	// Determine optimal account based on tax efficiency and available space
	// Priority: tax-advantaged accounts first (if space available), then taxable
	var targetAccount *Account

	// For tax efficiency, prefer tax-deferred or Roth accounts for growth assets
	if assetClass == AssetClassUSStocksTotalMarket || assetClass == AssetClassInternationalStocks {
		if accounts.TaxDeferred != nil {
			targetAccount = accounts.TaxDeferred
		} else if accounts.Roth != nil {
			targetAccount = accounts.Roth
		}
	}

	// Fall back to taxable account if no tax-advantaged account available
	if targetAccount == nil {
		targetAccount = accounts.Taxable
	}

	// Add the holding using existing lot tracking functionality
	err := sp.cashManager.AddHoldingWithLotTracking(targetAccount, assetClass, amount, currentMonth)
	if err != nil {
		return fmt.Errorf("failed to add holding: %v", err)
	}

	// Deduct cash for the purchase
	accounts.Cash -= amount

	simLogVerbose("BUY: %s $%.2f in %s account",
		assetClass, amount, getAccountTypeName(targetAccount, accounts))

	return nil
}

// getAccountTypeName returns a human-readable account type name
func getAccountTypeName(account *Account, accounts *AccountHoldingsMonthEnd) string {
	if account == accounts.Taxable {
		return "taxable"
	} else if account == accounts.TaxDeferred {
		return "tax-deferred"
	} else if account == accounts.Roth {
		return "Roth"
	}
	return "unknown"
}

// Tax loss harvesting and gain realization types and functions
type LossHarvestingCandidate struct {
	AssetClass    AssetClass
	PotentialLoss float64
	CurrentValue  float64
	HoldingID     string
}

type GainRealizationCandidate struct {
	AssetClass    AssetClass
	PotentialGain float64
	CurrentValue  float64
	IsLongTerm    bool
	HoldingID     string
}

func (sp *StrategyProcessor) identifyLossHarvestingCandidates(account *Account, settings TaxLossHarvestingSettings, currentMonth int) []LossHarvestingCandidate {
	var candidates []LossHarvestingCandidate

	if account == nil {
		return candidates
	}

	for _, holding := range account.Holdings {
		// Check if holding has unrealized losses
		if holding.UnrealizedGainLossTotal < 0 {
			potentialLoss := math.Abs(holding.UnrealizedGainLossTotal)

			// Only consider losses above minimum threshold
			if potentialLoss >= settings.MinimumLossThreshold {
				// Check wash sale period - don't harvest if we're in wash sale period
				if !sp.isInWashSalePeriod(holding.AssetClass, currentMonth, settings.WashSaleAvoidancePeriod) {
					candidates = append(candidates, LossHarvestingCandidate{
						AssetClass:    holding.AssetClass,
						PotentialLoss: potentialLoss,
						CurrentValue:  holding.CurrentMarketValueTotal,
						HoldingID:     holding.ID,
					})
				}
			}
		}
	}

	return candidates
}

func (sp *StrategyProcessor) identifyGainRealizationCandidates(account *Account, settings StrategicCapitalGainsSettings, currentMonth int) []GainRealizationCandidate {
	var candidates []GainRealizationCandidate

	if account == nil {
		return candidates
	}

	for _, holding := range account.Holdings {
		// Check if holding has unrealized gains
		if holding.UnrealizedGainLossTotal > 0 {
			potentialGain := holding.UnrealizedGainLossTotal

			// Only consider gains above minimum threshold
			if potentialGain >= settings.MinGainThreshold {
				// Check if this is a long-term holding (>365 days)
				isLongTerm := sp.isLongTermHolding(holding, currentMonth)

				// Prefer long-term gains for tax efficiency
				if isLongTerm || settings.AllowShortTermGains {
					candidates = append(candidates, GainRealizationCandidate{
						AssetClass:    holding.AssetClass,
						PotentialGain: potentialGain,
						CurrentValue:  holding.CurrentMarketValueTotal,
						IsLongTerm:    isLongTerm,
						HoldingID:     holding.ID,
					})
				}
			}
		}
	}

	return candidates
}

func (sp *StrategyProcessor) calculateLTCGCapacity(taxContext AdvancedTaxContext, targetBracket float64) float64 {
	// Calculate remaining capacity in target LTCG tax bracket
	currentLTCG := taxContext.LongTermCapitalGainsYTD

	// 2024 LTCG bracket thresholds (single filer)
	var bracketThreshold float64
	switch targetBracket {
	case 0.0: // 0% bracket
		bracketThreshold = 47025.0 // $47,025 for single filers in 2024
	case 0.15: // 15% bracket
		bracketThreshold = 518900.0 // $518,900 for single filers in 2024
	default:
		bracketThreshold = 47025.0 // Default to 0% bracket
	}

	// Calculate remaining capacity considering current ordinary income
	remainingCapacity := math.Max(0, bracketThreshold-taxContext.OrdinaryIncomeYTD-currentLTCG)

	return remainingCapacity
}

func (sp *StrategyProcessor) executeTaxLossHarvestingSale(account *Account, candidate LossHarvestingCandidate, amount float64, currentMonth int) LotSaleResult {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0),
		SaleTransactions: make([]SaleTransaction, 0),
	}

	if account == nil {
		return result
	}

	// Find the specific holding to sell
	for i := range account.Holdings {
		holding := &account.Holdings[i]
		if holding.AssetClass == candidate.AssetClass && holding.ID == candidate.HoldingID {
			// Calculate sale proportion
			saleProportion := math.Min(1.0, amount/holding.CurrentMarketValueTotal)

			// Calculate quantities
			quantitySold := holding.Quantity * saleProportion
			costBasisSold := holding.CostBasisTotal * saleProportion
			marketValueSold := holding.CurrentMarketValueTotal * saleProportion
			realizedGainLoss := marketValueSold - costBasisSold

			// Create sale transaction
			transaction := SaleTransaction{
				AssetClass:       holding.AssetClass,
				QuantitySold:     quantitySold,
				SalePrice:        marketValueSold,
				CostBasis:        costBasisSold,
				RealizedGainLoss: realizedGainLoss,
				IsLongTerm:       sp.isLongTermHolding(*holding, currentMonth),
				SaleDate:         currentMonth,
			}

			// Update holding
			holding.Quantity -= quantitySold
			holding.CostBasisTotal -= costBasisSold
			holding.CurrentMarketValueTotal -= marketValueSold
			holding.UnrealizedGainLossTotal = holding.CurrentMarketValueTotal - holding.CostBasisTotal

			// Update account totals
			account.TotalValue -= marketValueSold

			// Update result
			result.TotalProceeds += marketValueSold
			result.TotalRealizedGains += realizedGainLoss
			if transaction.IsLongTerm {
				result.LongTermGains += realizedGainLoss
			} else {
				result.ShortTermGains += realizedGainLoss
			}
			result.SaleTransactions = append(result.SaleTransactions, transaction)

			break
		}
	}

	return result
}

func (sp *StrategyProcessor) executeStrategicGainsSale(account *Account, candidate GainRealizationCandidate, amount float64, currentMonth int) LotSaleResult {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0),
		SaleTransactions: make([]SaleTransaction, 0),
	}

	if account == nil {
		return result
	}

	// Find the specific holding to sell
	for i := range account.Holdings {
		holding := &account.Holdings[i]
		if holding.AssetClass == candidate.AssetClass && holding.ID == candidate.HoldingID {
			// Calculate sale proportion
			saleProportion := math.Min(1.0, amount/holding.CurrentMarketValueTotal)

			// Calculate quantities
			quantitySold := holding.Quantity * saleProportion
			costBasisSold := holding.CostBasisTotal * saleProportion
			marketValueSold := holding.CurrentMarketValueTotal * saleProportion
			realizedGainLoss := marketValueSold - costBasisSold

			// Create sale transaction
			transaction := SaleTransaction{
				AssetClass:       holding.AssetClass,
				QuantitySold:     quantitySold,
				SalePrice:        marketValueSold,
				CostBasis:        costBasisSold,
				RealizedGainLoss: realizedGainLoss,
				IsLongTerm:       sp.isLongTermHolding(*holding, currentMonth),
				SaleDate:         currentMonth,
			}

			// Update holding
			holding.Quantity -= quantitySold
			holding.CostBasisTotal -= costBasisSold
			holding.CurrentMarketValueTotal -= marketValueSold
			holding.UnrealizedGainLossTotal = holding.CurrentMarketValueTotal - holding.CostBasisTotal

			// Update account totals
			account.TotalValue -= marketValueSold

			// Update result
			result.TotalProceeds += marketValueSold
			result.TotalRealizedGains += realizedGainLoss
			if transaction.IsLongTerm {
				result.LongTermGains += realizedGainLoss
			} else {
				result.ShortTermGains += realizedGainLoss
			}
			result.SaleTransactions = append(result.SaleTransactions, transaction)

			break
		}
	}

	return result
}

func (sp *StrategyProcessor) setWashSalePeriod(accounts *AccountHoldingsMonthEnd, assetClass AssetClass, currentMonth int, washSaleDays int) {
	// Set wash sale period for the asset class
	// In a full implementation, this would be stored in a wash sale tracking structure
	// For now, we'll implement a simple in-memory tracking
	if sp.washSalePeriods == nil {
		sp.washSalePeriods = make(map[AssetClass]int)
	}

	// Set the end month for the wash sale period
	sp.washSalePeriods[assetClass] = currentMonth + (washSaleDays / 30) // Convert days to months approximately
}

func (sp *StrategyProcessor) sellAssetsForCash(accounts *AccountHoldingsMonthEnd, amount float64, currentMonth int) error {
	// Use CashManager to execute tax-efficient withdrawal
	result, actualAmount := sp.cashManager.ExecuteTaxEfficientWithdrawal(accounts, amount, currentMonth)

	// Cash is already updated in ExecuteTaxEfficientWithdrawal
	simLogVerbose("CASH-RAISE: Requested $%.2f, received $%.2f proceeds (%.2f gains)",
		amount, actualAmount, result.ShortTermGains + result.LongTermGains)

	return nil
}

func (sp *StrategyProcessor) investExcessCash(accounts *AccountHoldingsMonthEnd, amount float64, currentMonth int) error {
	// DISABLED: Auto-invest should only fulfill user-defined contribution events, not create new ones
	// If the user has no contribution events, cash should accumulate
	// Investment events define the MAXIMUM amount to invest; auto-invest uses excess cash to fund them
	// Leftover cash stays in the cash account

	simLogVerbose("CASH-INVEST: Skipping auto-invest (no contribution events defined) - cash will accumulate")
	return nil
}

func (sp *StrategyProcessor) processDebtAvalanche(accounts *AccountHoldingsMonthEnd, liabilities []Liability, strategy DebtManagementStrategy, currentMonth int) error {
	// Debt avalanche: prioritize highest interest rate debts first
	if accounts.Cash < strategy.ExtraPaymentAmount {
		return nil // Not enough cash for extra payment
	}

	// Sort liabilities by interest rate (highest first)
	sortedLiabilities := make([]Liability, len(liabilities))
	copy(sortedLiabilities, liabilities)

	for i := 0; i < len(sortedLiabilities)-1; i++ {
		for j := i + 1; j < len(sortedLiabilities); j++ {
			if sortedLiabilities[i].AnnualInterestRate < sortedLiabilities[j].AnnualInterestRate {
				sortedLiabilities[i], sortedLiabilities[j] = sortedLiabilities[j], sortedLiabilities[i]
			}
		}
	}

	// Apply extra payment to highest interest rate debt
	remainingExtraPayment := strategy.ExtraPaymentAmount
	for _, liability := range sortedLiabilities {
		if remainingExtraPayment <= 0 || liability.CurrentPrincipalBalance <= 0 {
			continue
		}

		// Calculate how much to pay (can't exceed remaining balance)
		paymentAmount := math.Min(remainingExtraPayment, liability.CurrentPrincipalBalance)

		// Make the payment
		accounts.Cash -= paymentAmount
		liability.CurrentPrincipalBalance -= paymentAmount
		remainingExtraPayment -= paymentAmount

		simLogVerbose("💳 [DEBT-AVALANCHE] Extra payment $%.2f to %s (%.2f%% APR), remaining balance: $%.2f",
			paymentAmount, liability.Type, liability.AnnualInterestRate*100, liability.CurrentPrincipalBalance)

		if liability.CurrentPrincipalBalance <= 0 {
			simLogVerbose("✅ [DEBT-AVALANCHE] Paid off %s with avalanche strategy", liability.Type)
		}
	}

	return nil
}

func (sp *StrategyProcessor) processDebtSnowball(accounts *AccountHoldingsMonthEnd, liabilities []Liability, strategy DebtManagementStrategy, currentMonth int) error {
	// Debt snowball: prioritize smallest balance debts first for psychological wins
	if accounts.Cash < strategy.ExtraPaymentAmount {
		return nil // Not enough cash for extra payment
	}

	// Sort liabilities by balance (smallest first)
	sortedLiabilities := make([]Liability, len(liabilities))
	copy(sortedLiabilities, liabilities)

	for i := 0; i < len(sortedLiabilities)-1; i++ {
		for j := i + 1; j < len(sortedLiabilities); j++ {
			if sortedLiabilities[i].CurrentPrincipalBalance > sortedLiabilities[j].CurrentPrincipalBalance {
				sortedLiabilities[i], sortedLiabilities[j] = sortedLiabilities[j], sortedLiabilities[i]
			}
		}
	}

	// Apply extra payment to smallest balance debt
	remainingExtraPayment := strategy.ExtraPaymentAmount
	for _, liability := range sortedLiabilities {
		if remainingExtraPayment <= 0 || liability.CurrentPrincipalBalance <= 0 {
			continue
		}

		// Calculate how much to pay (can't exceed remaining balance)
		paymentAmount := math.Min(remainingExtraPayment, liability.CurrentPrincipalBalance)

		// Make the payment
		accounts.Cash -= paymentAmount
		liability.CurrentPrincipalBalance -= paymentAmount
		remainingExtraPayment -= paymentAmount

		simLogVerbose("💳 [DEBT-SNOWBALL] Extra payment $%.2f to %s (balance was $%.2f), remaining balance: $%.2f",
			paymentAmount, liability.Type, liability.CurrentPrincipalBalance+paymentAmount, liability.CurrentPrincipalBalance)

		if liability.CurrentPrincipalBalance <= 0 {
			simLogVerbose("✅ [DEBT-SNOWBALL] Paid off %s with snowball strategy - psychological win!", liability.Type)
		}
	}

	return nil
}

func (sp *StrategyProcessor) processCustomDebtPayment(accounts *AccountHoldingsMonthEnd, liabilities []Liability, strategy DebtManagementStrategy, currentMonth int) error {
	// Custom debt payment: use target debt ID if specified, otherwise apply proportionally
	if accounts.Cash < strategy.ExtraPaymentAmount {
		return nil // Not enough cash for extra payment
	}

	// Check if custom debt priorities are specified
	if len(strategy.DebtPriorities) > 0 {
		// Sort debts by custom priority (higher priority number = pay first)
		sortedLiabilities := make([]Liability, 0, len(liabilities))
		for _, liability := range liabilities {
			if liability.CurrentPrincipalBalance > 0 {
				sortedLiabilities = append(sortedLiabilities, liability)
			}
		}

		// Sort by priority (highest priority first, then by ID for consistency)
		for i := 0; i < len(sortedLiabilities)-1; i++ {
			for j := i + 1; j < len(sortedLiabilities); j++ {
				iPriority := strategy.DebtPriorities[sortedLiabilities[i].ID]
				jPriority := strategy.DebtPriorities[sortedLiabilities[j].ID]
				if iPriority < jPriority {
					sortedLiabilities[i], sortedLiabilities[j] = sortedLiabilities[j], sortedLiabilities[i]
				}
			}
		}

		// Apply extra payment to highest priority debt first
		remainingExtraPayment := strategy.ExtraPaymentAmount
		for _, liability := range sortedLiabilities {
			if remainingExtraPayment <= 0 {
				break
			}

			priority := strategy.DebtPriorities[liability.ID]
			paymentAmount := math.Min(remainingExtraPayment, liability.CurrentPrincipalBalance)

			accounts.Cash -= paymentAmount
			liability.CurrentPrincipalBalance -= paymentAmount
			remainingExtraPayment -= paymentAmount

			simLogVerbose("💳 [DEBT-CUSTOM] Extra payment $%.2f to priority %d debt %s, remaining balance: $%.2f",
				paymentAmount, priority, liability.Type, liability.CurrentPrincipalBalance)

			if liability.CurrentPrincipalBalance <= 0 {
				simLogVerbose("✅ [DEBT-CUSTOM] Paid off priority debt %s with custom strategy", liability.Type)
			}
		}

		return nil
	}

	// If no target debt or target not found, apply proportionally across all debts
	// Calculate total debt for proportional distribution
	totalDebt := 0.0
	for _, liability := range liabilities {
		if liability.CurrentPrincipalBalance > 0 {
			totalDebt += liability.CurrentPrincipalBalance
		}
	}

	if totalDebt <= 0 {
		return nil // No debts to pay
	}

	// Apply extra payment proportionally
	remainingExtraPayment := strategy.ExtraPaymentAmount
	for _, liability := range liabilities {
		if remainingExtraPayment <= 0 || liability.CurrentPrincipalBalance <= 0 {
			continue
		}

		// Calculate proportional payment
		proportion := liability.CurrentPrincipalBalance / totalDebt
		proportionalPayment := strategy.ExtraPaymentAmount * proportion
		paymentAmount := math.Min(proportionalPayment, math.Min(remainingExtraPayment, liability.CurrentPrincipalBalance))

		// Make the payment
		accounts.Cash -= paymentAmount
		liability.CurrentPrincipalBalance -= paymentAmount
		remainingExtraPayment -= paymentAmount

		simLogVerbose("💳 [DEBT-CUSTOM] Proportional payment $%.2f to %s (%.1f%% of extra payment), remaining balance: $%.2f",
			paymentAmount, liability.Type, proportion*100, liability.CurrentPrincipalBalance)
	}

	return nil
}

// Helper functions for strategy processing

// isInWashSalePeriod checks if an asset class is in wash sale period
func (sp *StrategyProcessor) isInWashSalePeriod(assetClass AssetClass, currentMonth int, washSaleDays int) bool {
	if sp.washSalePeriods == nil {
		return false
	}

	endMonth, exists := sp.washSalePeriods[assetClass]
	if !exists {
		return false
	}

	return currentMonth <= endMonth
}

// isLongTermHolding determines if a holding qualifies for long-term capital gains treatment
func (sp *StrategyProcessor) isLongTermHolding(holding Holding, currentMonth int) bool {
	// Check if ANY lot in the holding is long-term (held for more than 12 months)
	// Since we're using FIFO, if we need to sell, we sell the oldest lots first
	// So if any lot is long-term, this holding can generate long-term gains
	if len(holding.Lots) == 0 {
		return true // Default to long-term if no lots (legacy holdings)
	}

	// Check the oldest lot (FIFO means oldest sold first)
	for _, lot := range holding.Lots {
		holdingPeriodMonths := currentMonth - lot.AcquisitionDate
		if holdingPeriodMonths > 12 {
			return true // If any lot is long-term, this holding can generate long-term gains
		}
	}
	return false // All lots are short-term
}

// ProcessConcentrationRisk implements concentration risk monitoring and alerts
func (sp *StrategyProcessor) ProcessConcentrationRisk(
	accounts *AccountHoldingsMonthEnd,
	settings ConcentrationRiskSettings,
	currentMonth int,
) ([]ConcentrationRiskAlert, error) {
	var alerts []ConcentrationRiskAlert

	if !settings.Enabled {
		return alerts, nil
	}

	// Calculate total portfolio value (excluding cash)
	totalValue := 0.0
	if accounts.Taxable != nil {
		taxableAccount := accounts.Taxable
		totalValue += taxableAccount.TotalValue
	}
	if accounts.TaxDeferred != nil {
		taxDeferredAccount := accounts.TaxDeferred
		totalValue += taxDeferredAccount.TotalValue
	}
	if accounts.Roth != nil {
		rothAccount := accounts.Roth
		totalValue += rothAccount.TotalValue
	}

	if totalValue <= 0 {
		return alerts, nil
	}

	// Track asset class concentrations
	assetClassValues := make(map[AssetClass]float64)

	// Aggregate holdings across all accounts
	accounts_slice := []*Account{accounts.Taxable, accounts.TaxDeferred, accounts.Roth}
	for _, account := range accounts_slice {
		if account == nil {
			continue
		}

		for _, holding := range account.Holdings {
			assetClassValues[holding.AssetClass] += holding.CurrentMarketValueTotal
		}
	}

	// Check each asset class against concentration threshold
	for assetClass, value := range assetClassValues {
		if assetClass == AssetClassCash {
			continue // Skip cash in concentration analysis
		}

		concentration := (value / totalValue) * 100.0
		if concentration > settings.ThresholdPercentage {
			alerts = append(alerts, ConcentrationRiskAlert{
				AssetClass:           assetClass,
				CurrentConcentration: concentration,
				ThresholdExceeded:    concentration - settings.ThresholdPercentage,
				RecommendedAction:    sp.generateConcentrationAction(assetClass, concentration, settings),
				DetectedMonth:        currentMonth,
			})
		}
	}

	return alerts, nil
}

// generateConcentrationAction suggests actions for concentration risk
func (sp *StrategyProcessor) generateConcentrationAction(assetClass AssetClass, concentration float64, settings ConcentrationRiskSettings) string {
	if concentration > settings.ThresholdPercentage*2 {
		return fmt.Sprintf("URGENT: Reduce %s allocation by selling excess holdings", assetClass)
	} else if concentration > settings.ThresholdPercentage*1.5 {
		return fmt.Sprintf("Consider reducing %s allocation through rebalancing", assetClass)
	} else {
		return fmt.Sprintf("Monitor %s allocation - close to threshold", assetClass)
	}
}

// ProcessAdvancedCashManagement implements sophisticated cash management with tax efficiency
func (sp *StrategyProcessor) ProcessAdvancedCashManagement(
	accounts *AccountHoldingsMonthEnd,
	strategy AdvancedCashManagementStrategy,
	currentMonth int,
) error {
	// Calculate current cash position and target
	currentCash := accounts.Cash
	targetCash := strategy.TargetCashReserve

	// Handle cash shortfall with tax-efficient withdrawal sequencing
	if currentCash < targetCash && strategy.AutomaticallyMeetShortfall {
		shortfall := targetCash - currentCash
		return sp.executeTaxEfficientWithdrawal(accounts, shortfall, currentMonth)
	}

	// Handle excess cash with strategic investment
	if currentCash > targetCash*1.5 && strategy.AutomaticallyInvestExcess {
		excess := currentCash - targetCash
		return sp.executeStrategicInvestment(accounts, excess, strategy.InvestmentPreferences, currentMonth)
	}

	return nil
}

// executeTaxEfficientWithdrawal implements tax-efficient withdrawal sequencing
func (sp *StrategyProcessor) executeTaxEfficientWithdrawal(accounts *AccountHoldingsMonthEnd, amount float64, currentMonth int) error {
	remainingNeeded := amount

	// Default withdrawal sequence: taxable -> tax-deferred -> Roth
	withdrawalSequence := []*Account{accounts.Taxable, accounts.TaxDeferred, accounts.Roth}
	accountNames := []string{"taxable", "tax_deferred", "roth"}

	for i, account := range withdrawalSequence {
		if account == nil || remainingNeeded <= 0 {
			continue
		}

		// Calculate how much to withdraw from this account
		availableInAccount := account.TotalValue
		toWithdraw := math.Min(remainingNeeded, availableInAccount)

		if toWithdraw > 0 {
			// Execute withdrawal using cash manager
			saleResult := sp.cashManager.SellAssetsFromAccountFIFO(account, toWithdraw, currentMonth)

			// Add proceeds to cash
			accounts.Cash += saleResult.TotalProceeds
			remainingNeeded -= saleResult.TotalProceeds

			// Handle tax implications
			if accountNames[i] == "taxable" {
				// Capital gains/losses from taxable account
				// (handled by cash manager)
			} else if accountNames[i] == "tax_deferred" {
				// Tax-deferred withdrawals are ordinary income
				// (would be tracked in tax context)
			}
			// Roth withdrawals are generally tax-free
		}
	}

	if remainingNeeded > 0.01 {
		return fmt.Errorf("unable to fully satisfy withdrawal: $%.2f remaining", remainingNeeded)
	}

	return nil
}

// executeStrategicInvestment invests excess cash according to strategy preferences
func (sp *StrategyProcessor) executeStrategicInvestment(
	accounts *AccountHoldingsMonthEnd,
	amount float64,
	preferences InvestmentPreferences,
	currentMonth int,
) error {
	// Reduce cash
	accounts.Cash -= amount

	// Determine target account based on preferences
	var targetAccount *Account
	switch preferences.PreferredAccount {
	case "taxable":
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAccount = accounts.Taxable
	case "tax_deferred":
		if accounts.TaxDeferred == nil {
			accounts.TaxDeferred = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAccount = accounts.TaxDeferred
	case "roth":
		if accounts.Roth == nil {
			accounts.Roth = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAccount = accounts.Roth
	default:
		// Default to taxable
		if accounts.Taxable == nil {
			accounts.Taxable = &Account{Holdings: []Holding{}, TotalValue: 0}
		}
		targetAccount = accounts.Taxable
	}

	// Add investment to account using cash manager
	return sp.cashManager.AddHoldingWithLotTracking(
		targetAccount,
		preferences.PreferredAssetClass,
		amount,
		currentMonth,
	)
}

// getDefaultStrategySettings returns default strategy settings for event generation
func getDefaultStrategySettings() StrategySettings {
	// Use centralized default asset allocation from configuration
	allocations := GetDefaultAssetAllocation()

	return StrategySettings{
		AssetAllocation: AssetAllocationStrategy{
			StrategyType:       "fixed",
			Allocations:        allocations,
			RebalanceThreshold: GetDefaultRebalanceThreshold(),
		},
		Rebalancing: RebalancingParameters{
			Method:              "threshold",
			ThresholdPercentage: 0.05, // 5% deviation threshold
			Frequency:           "quarterly",
			MinimumTradeSize:    1000.0,
			TaxAwarenessLevel:   "basic",
		},
		TaxLossHarvesting: TaxLossHarvestingSettings{
			Enabled:                 false,
			MinimumLossThreshold:    500.0,
			WashSaleAvoidancePeriod: 31,
			MaxAnnualLossHarvest:    3000.0,
			ReplaceWithSimilar:      true,
		},
		CashManagement: CashManagementStrategy{
			TargetReserveAmount: 10000.0,
			TargetReserveMonths: 6.0,
			AutoInvestExcess:    true,
		},
	}
}
