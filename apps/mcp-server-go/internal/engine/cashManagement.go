package engine

import (
	"fmt"
	"math"
	"sort"
	"strconv"
)

// CashManager handles FIFO lot management and tax-efficient withdrawals
type CashManager struct {
	nextLotID    int
	config       *StochasticModelConfig
	marketPrices *MarketPrices // Current market prices for share-based calculations
	// PERF: When true, SellAssetsFromAccountFIFO computes totals without materializing
	// SoldLots/SaleTransactions slices (MC mode never reads them)
	SummaryOnly bool
}

// NewCashManager creates a new cash manager
func NewCashManager() *CashManager {
	defaultPrices := CreateDefaultMarketPrices()
	return &CashManager{
		nextLotID:    1,
		config:       nil,
		marketPrices: &defaultPrices,
	}
}

// NewCashManagerWithConfig creates a new cash manager with configuration
func NewCashManagerWithConfig(config *StochasticModelConfig) *CashManager {
	defaultPrices := CreateDefaultMarketPrices()
	return &CashManager{
		nextLotID:    1,
		config:       config,
		marketPrices: &defaultPrices,
	}
}

// UpdateMarketPrices updates the market prices used for share-based calculations
func (cm *CashManager) UpdateMarketPrices(marketPrices *MarketPrices) {
	if marketPrices != nil {
		cm.marketPrices = marketPrices
	}
}

// getPricePerShare returns the current market price per share for the given asset class
// Returns an error for unknown asset classes to force explicit error handling
func (cm *CashManager) getPricePerShare(assetClass AssetClass, marketPrices *MarketPrices) (float64, error) {
	// Normalize asset class to handle UI naming variations
	normalized := NormalizeAssetClass(assetClass)

	switch normalized {
	case AssetClassUSStocksTotalMarket:
		return marketPrices.SPY, nil
	case AssetClassUSBondsTotalMarket:
		return marketPrices.BND, nil
	case AssetClassInternationalStocks:
		return marketPrices.INTL, nil
	case AssetClassRealEstatePrimaryHome:
		return marketPrices.RealEstate, nil
	case AssetClassIndividualStock:
		return marketPrices.Individual, nil
	case AssetClassCash:
		return marketPrices.Cash, nil // Always 1.0
	case AssetClassOtherAssets:
		return marketPrices.Other, nil
	default:
		return 0.0, fmt.Errorf("unknown asset class '%s' - cannot determine market price", normalized)
	}
}

// AddHoldingWithLotTracking adds a new holding with proper lot tracking using TRUE share-based model
// CRITICAL FIX: This now implements real share-based calculations for accurate capital gains
func (cm *CashManager) AddHoldingWithLotTracking(account *Account, assetClass AssetClass, dollarAmount float64, acquisitionDate int) error {
	if dollarAmount <= 0 {
		simLogVerbose("❌ [ADD-HOLDING-FAILED] Dollar amount must be positive: %.2f", dollarAmount)
		return fmt.Errorf("dollar amount must be positive: %.2f", dollarAmount)
	}
	if account == nil {
		simLogVerbose("❌ [ADD-HOLDING-FAILED] Account cannot be nil")
		return fmt.Errorf("account cannot be nil")
	}

	// CRITICAL: Calculate actual shares to purchase based on current market price
	// This is the foundation of the share-based model - we MUST track real shares, not dollar placeholders
	pricePerShare, err := cm.getPricePerShare(assetClass, cm.marketPrices)
	if err != nil {
		simLogVerbose("❌ [ADD-HOLDING-FAILED] Failed to get price per share for %s: %v", assetClass, err)
		return fmt.Errorf("failed to get price per share: %w", err)
	}
	if pricePerShare <= 0 {
		simLogVerbose("❌ [ADD-HOLDING-FAILED] Invalid price per share for %s: %.6f (marketPrices: SPY=%.2f, BND=%.2f)",
			assetClass, pricePerShare, cm.marketPrices.SPY, cm.marketPrices.BND)
		return fmt.Errorf("invalid price per share for asset class %s: %.6f", assetClass, pricePerShare)
	}

	// Calculate the EXACT number of shares being purchased (not rounded)
	sharesToPurchase := dollarAmount / pricePerShare
	if sharesToPurchase <= 0 {
		return fmt.Errorf("calculated share quantity must be positive: %.6f shares for $%.2f at $%.6f per share", sharesToPurchase, dollarAmount, pricePerShare)
	}

	// Look for existing holding of same asset class to add to
	for i := range account.Holdings {
		if account.Holdings[i].AssetClass == assetClass {
			// Add new lot to existing holding
			if err := cm.addShareLotToHolding(&account.Holdings[i], sharesToPurchase, pricePerShare, acquisitionDate); err != nil {
				return fmt.Errorf("failed to add share lot to existing holding: %v", err)
			}
			// Recalculate holding totals from ALL lots (weighted averages)
			cm.recalculateHoldingFromLots(&account.Holdings[i])
			// Update account total value from sum of all holdings
			cm.recalculateAccountTotalValue(account)
			return nil
		}
	}

	// Create new holding with share-based model - start with EMPTY lots, build from tax lots
	newHolding := Holding{
		AssetClass:                assetClass,
		Quantity:                  0,  // Will be calculated from lots
		CostBasisPerUnit:          0,  // Will be calculated as weighted average
		CostBasisTotal:            0,  // Will be calculated from lots
		CurrentMarketPricePerUnit: pricePerShare,
		CurrentMarketValueTotal:   0,  // Will be calculated from quantity * current price
		UnrealizedGainLossTotal:   0,  // Will be calculated from market value - cost basis
		Lots:                      make([]TaxLot, 0, 16), // PERF: Pre-allocate for typical lot growth
	}

	// Add the initial lot with exact share tracking
	if err := cm.addShareLotToHolding(&newHolding, sharesToPurchase, pricePerShare, acquisitionDate); err != nil {
		return fmt.Errorf("failed to add initial share lot: %v", err)
	}

	// Calculate ALL holding totals from lots (this is the mathematical core)
	cm.recalculateHoldingFromLots(&newHolding)

	// Add to account and update account totals
	account.Holdings = append(account.Holdings, newHolding)
	cm.recalculateAccountTotalValue(account)
	return nil
}

// recalculateAccountTotalValue calculates account total from sum of holdings (prevents double-counting)
func (cm *CashManager) recalculateAccountTotalValue(account *Account) {
	if account == nil {
		return
	}

	totalValue := 0.0
	for _, holding := range account.Holdings {
		totalValue += holding.CurrentMarketValueTotal
	}
	account.TotalValue = totalValue
}

// addShareLotToHolding adds a new tax lot using precise share-based calculations
// CRITICAL: This is the mathematical foundation for accurate capital gains tracking
func (cm *CashManager) addShareLotToHolding(holding *Holding, shareQuantity float64, pricePerShare float64, acquisitionDate int) error {
	if holding == nil {
		return fmt.Errorf("holding cannot be nil")
	}
	if shareQuantity <= 0 {
		return fmt.Errorf("share quantity must be positive: %.6f", shareQuantity)
	}
	if pricePerShare <= 0 {
		return fmt.Errorf("price per share must be positive: %.6f", pricePerShare)
	}

	// PERF: Generate lot ID with strconv instead of fmt.Sprintf (avoids format parsing overhead)
	lotID := "lot_" + strconv.Itoa(cm.nextLotID) + "_" + string(holding.AssetClass) + "_" + strconv.Itoa(acquisitionDate)
	cm.nextLotID++

	// Calculate EXACT total cost basis for this specific lot
	totalCostBasis := shareQuantity * pricePerShare

	// Create tax lot with precise share-based data
	newLot := TaxLot{
		ID:                lotID,
		AssetClass:        holding.AssetClass,
		Quantity:          shareQuantity,         // EXACT number of shares in this lot
		CostBasisPerUnit:  pricePerShare,        // EXACT price per share at purchase
		CostBasisTotal:    totalCostBasis,       // EXACT total cost basis for this lot
		AcquisitionDate:   acquisitionDate,      // For long-term vs short-term determination
		IsLongTerm:        false,                // Updated during lot term status updates
		WashSalePeriodEnd: 0,                    // No wash sale restriction initially
	}

	// Add lot to holding's tax lot collection
	holding.Lots = append(holding.Lots, newLot)
	return nil
}

// recalculateHoldingFromLots recalculates ALL holding totals from individual tax lots
// CRITICAL: This is the mathematical core that ensures accuracy across all capital gains calculations
func (cm *CashManager) recalculateHoldingFromLots(holding *Holding) {
	if holding == nil {
		return
	}

	// Calculate totals by summing ALL lots - this ensures mathematical consistency
	totalQuantity := 0.0
	totalCostBasis := 0.0

	for _, lot := range holding.Lots {
		totalQuantity += lot.Quantity
		totalCostBasis += lot.CostBasisTotal
	}

	// Set holding totals from lot aggregation
	holding.Quantity = totalQuantity
	holding.CostBasisTotal = totalCostBasis

	// Calculate weighted average cost basis per unit
	if totalQuantity > 0 {
		holding.CostBasisPerUnit = totalCostBasis / totalQuantity
	} else {
		holding.CostBasisPerUnit = 0
	}

	// CRITICAL FIX: Get fresh market price before calculating current value
	// The holding's CurrentMarketPricePerUnit may be stale after lot sales
	currentPrice, err := cm.getPricePerShare(holding.AssetClass, cm.marketPrices)
	if err != nil {
		simLogVerbose("❌ [RECALCULATE-HOLDING] Failed to get price for %s: %v - using stored price", holding.AssetClass, err)
		currentPrice = holding.CurrentMarketPricePerUnit  // Fallback to stored price
	}
	if currentPrice <= 0 {
		simLogVerbose("⚠️ [RECALCULATE-HOLDING] Invalid price %.6f for %s - using stored price", currentPrice, holding.AssetClass)
		currentPrice = holding.CurrentMarketPricePerUnit  // Fallback to stored price
	}

	// Update price and calculate current market value using total shares * FRESH market price
	holding.CurrentMarketPricePerUnit = currentPrice
	holding.CurrentMarketValueTotal = totalQuantity * currentPrice

	// Calculate unrealized gain/loss
	holding.UnrealizedGainLossTotal = holding.CurrentMarketValueTotal - holding.CostBasisTotal
}

// LEGACY SUPPORT: Keep old function name as alias for backwards compatibility
func (cm *CashManager) updateHoldingTotals(holding *Holding) {
	cm.recalculateHoldingFromLots(holding)
}

// UpdateLotTermStatus updates long-term vs short-term status for all lots
func (cm *CashManager) UpdateLotTermStatus(accounts *AccountHoldingsMonthEnd, currentMonth int) {
	var accountSlice []*Account

	// Build account slice
	if accounts.Taxable != nil {
		accountSlice = append(accountSlice, accounts.Taxable)
	}
	if accounts.TaxDeferred != nil {
		accountSlice = append(accountSlice, accounts.TaxDeferred)
	}
	if accounts.Roth != nil {
		accountSlice = append(accountSlice, accounts.Roth)
	}

	for _, account := range accountSlice {
		if account == nil {
			continue
		}

		for i := range account.Holdings {
			holding := &account.Holdings[i]
			for j := range holding.Lots {
				lot := &holding.Lots[j]
				// Long-term if held for more than 12 months
				lot.IsLongTerm = (currentMonth - lot.AcquisitionDate) > 12
			}
		}
	}
}

// SellAssetsFromAccountFIFO sells assets using FIFO methodology with liquidity-aware prioritization using current market prices
func (cm *CashManager) SellAssetsFromAccountFIFO(account *Account, targetAmount float64, currentMonth int) LotSaleResult {
	var result LotSaleResult
	if !cm.SummaryOnly {
		result.SoldLots = make([]TaxLot, 0, 10)
		result.SaleTransactions = make([]SaleTransaction, 0, 10)
	}

	if account == nil || targetAmount <= 0 {
		return result
	}

	// Ensure holdings have liquidity tiers assigned
	liquidityMgr := NewLiquidityManager()
	account.Holdings = liquidityMgr.AssignLiquidityTiers(account.Holdings)

	// Create indices for holdings sorted by liquidity (most liquid first)
	holdingIndices := make([]int, len(account.Holdings))
	for i := range holdingIndices {
		holdingIndices[i] = i
	}

	sort.Slice(holdingIndices, func(i, j int) bool {
		tierI := account.Holdings[holdingIndices[i]].LiquidityTier
		tierJ := account.Holdings[holdingIndices[j]].LiquidityTier
		return liquidityMgr.getLiquidityPriority(tierI) < liquidityMgr.getLiquidityPriority(tierJ)
	})

	remainingToSell := targetAmount

	// Process holdings in liquidity order - most liquid first
	for _, idx := range holdingIndices {
		if remainingToSell <= 0 {
			break
		}
		holding := &account.Holdings[idx]
		if len(holding.Lots) == 0 {
			continue
		}

		// CRITICAL FIX: Get price ONCE for the entire holding BEFORE modifying any lots
		// All lots in a holding share the same AssetClass, so we only need one price lookup
		// If this fails, skip the entire holding to prevent destructive operations
		currentPrice, err := cm.getPricePerShare(holding.AssetClass, cm.marketPrices)
		if err != nil {
			continue // Skip to next holding without modifying this one
		}
		if currentPrice <= 0 {
			continue // Skip to next holding without modifying this one
		}

		// Sort lots by acquisition date (FIFO) - only if not already sorted
		if !cm.isLotsSorted(holding.Lots) {
			sort.Slice(holding.Lots, func(i, j int) bool {
				return holding.Lots[i].AcquisitionDate < holding.Lots[j].AcquisitionDate
			})
		}

		// Sell lots in FIFO order using the validated price
		lotsToRemove := []int{}
		for j, lot := range holding.Lots {
			if remainingToSell <= 0 {
				break
			}

			lotValue := lot.Quantity * currentPrice
			sellAmount := math.Min(remainingToSell, lotValue)
			sellQuantity := sellAmount / currentPrice

			if sellQuantity > 0 {
				// PERF: In summary-only mode, compute totals inline without materializing
				// SaleTransaction/SoldLot objects (saves fmt.Sprintf + struct allocs in MC)
				costBasis := sellQuantity * lot.CostBasisPerUnit
				grossProceeds := sellQuantity * currentPrice
				transactionCost := cm.calculateTransactionCost(grossProceeds)
				netProceeds := grossProceeds - transactionCost
				gainLoss := netProceeds - costBasis

				if !cm.SummaryOnly {
					saleResult := cm.createSaleTransaction(lot, sellQuantity, currentPrice, currentMonth)
					result.SaleTransactions = append(result.SaleTransactions, saleResult)
				}

				if VERBOSE_DEBUG {
					simLogVerbose("🔍 SALE TRANSACTION: Asset=%s, Quantity=%.2f, SalePrice=%.2f, Proceeds=%.2f, CostBasis=%.2f, Gain=%.2f, IsLongTerm=%v",
						string(lot.AssetClass), sellQuantity, currentPrice, netProceeds, costBasis, gainLoss, lot.IsLongTerm)
				}

				// Update totals
				result.TotalProceeds += netProceeds
				result.TotalCostBasis += costBasis
				result.TotalRealizedGains += gainLoss

				if gainLoss > 0 { // Only positive gains
					if lot.IsLongTerm {
						result.LongTermGains += gainLoss
					} else {
						result.ShortTermGains += gainLoss
					}
				}

				// Update lot
				if sellQuantity >= lot.Quantity {
					// Completely sold this lot
					if !cm.SummaryOnly {
						result.SoldLots = append(result.SoldLots, lot)
					}
					lotsToRemove = append(lotsToRemove, j)
				} else {
					// Partially sold
					if !cm.SummaryOnly {
						partialLot := TaxLot{
							ID:                lot.ID + "_partial_" + strconv.Itoa(cm.nextLotID),
							AssetClass:        lot.AssetClass,
							Quantity:          sellQuantity,
							CostBasisPerUnit:  lot.CostBasisPerUnit,
							CostBasisTotal:    lot.CostBasisPerUnit * sellQuantity,
							AcquisitionDate:   lot.AcquisitionDate,
							IsLongTerm:        lot.IsLongTerm,
							WashSalePeriodEnd: lot.WashSalePeriodEnd,
						}
						cm.nextLotID++
						result.SoldLots = append(result.SoldLots, partialLot)
					}

					// Update remaining lot
					partialCost := lot.CostBasisPerUnit * sellQuantity
					holding.Lots[j].Quantity -= sellQuantity
					holding.Lots[j].CostBasisTotal -= partialCost
				}

				remainingToSell -= sellAmount
			}
		}

		// Remove completely sold lots efficiently using slice filtering
		if len(lotsToRemove) > 0 {
			// Create new slice with remaining lots
			newLots := make([]TaxLot, 0, len(holding.Lots)-len(lotsToRemove))
			removeMap := make(map[int]bool, len(lotsToRemove))
			for _, idx := range lotsToRemove {
				removeMap[idx] = true
			}

			for j, lot := range holding.Lots {
				if !removeMap[j] {
					newLots = append(newLots, lot)
				}
			}
			holding.Lots = newLots
		}

		// Update holding totals
		cm.updateHoldingTotals(holding)
	}

	// Initialize net proceeds to gross proceeds (will be adjusted for taxable accounts)
	result.NetProceeds = result.TotalProceeds

	// Update account total value
	account.TotalValue -= result.TotalProceeds

	return result
}

// createSaleTransaction creates a sale transaction record with transaction costs
func (cm *CashManager) createSaleTransaction(lot TaxLot, sellQuantity float64, salePrice float64, saleDate int) SaleTransaction {
	grossProceeds := sellQuantity * salePrice
	costBasis := sellQuantity * lot.CostBasisPerUnit

	// Calculate transaction costs
	transactionCost := cm.calculateTransactionCost(grossProceeds)

	// Net proceeds after transaction costs
	netProceeds := grossProceeds - transactionCost

	// Realized gain/loss is based on net proceeds
	gainLoss := netProceeds - costBasis

	return SaleTransaction{
		ID:               "sale_" + strconv.Itoa(cm.nextLotID) + "_" + string(lot.AssetClass) + "_" + strconv.Itoa(saleDate),
		AssetClass:       lot.AssetClass,
		Quantity:         sellQuantity,
		SalePrice:        salePrice,
		SaleDate:         saleDate,
		Proceeds:         netProceeds, // Net proceeds after transaction costs
		CostBasis:        costBasis,
		RealizedGainLoss: gainLoss,
		IsLongTerm:       lot.IsLongTerm,
		SoldLots:         []TaxLot{lot},
	}
}

// calculateTransactionCost calculates the transaction cost for a sale
func (cm *CashManager) calculateTransactionCost(transactionValue float64) float64 {
	if cm.config == nil {
		return 0 // No transaction costs if config not available
	}

	// Calculate percentage-based cost
	percentageCost := transactionValue * cm.config.TransactionCostPercentage

	// Apply minimum and maximum constraints
	transactionCost := percentageCost
	if cm.config.TransactionCostMinimum > 0 && transactionCost < cm.config.TransactionCostMinimum {
		transactionCost = cm.config.TransactionCostMinimum
	}
	if cm.config.TransactionCostMaximum > 0 && transactionCost > cm.config.TransactionCostMaximum {
		transactionCost = cm.config.TransactionCostMaximum
	}

	return transactionCost
}

// ExecuteTaxEfficientWithdrawal executes a withdrawal using default tax-efficient sequence
func (cm *CashManager) ExecuteTaxEfficientWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int) (LotSaleResult, float64) {
	// Pass default values since tax-efficient strategy doesn't use tax calculations
	return cm.ExecuteWithdrawalWithStrategy(accounts, targetAmount, WithdrawalSequenceTaxEfficient, currentMonth, 0, FilingStatusSingle)
}

// ExecuteWithdrawalWithStrategy executes a withdrawal with the specified strategy
func (cm *CashManager) ExecuteWithdrawalWithStrategy(accounts *AccountHoldingsMonthEnd, targetAmount float64, strategy WithdrawalSequence, currentMonth int, ytdOrdinaryIncome float64, filingStatus FilingStatus) (LotSaleResult, float64) {
	switch strategy {
	case WithdrawalSequenceTaxEfficient:
		return cm.executeConventionalWithdrawal(accounts, targetAmount, currentMonth)
	case WithdrawalSequenceTaxDeferredFirst:
		return cm.executeRothMaximizationWithdrawal(accounts, targetAmount, currentMonth)
	case WithdrawalSequenceTaxDeferred:
		return cm.executeTaxBracketAwareWithdrawal(accounts, targetAmount, currentMonth, ytdOrdinaryIncome, filingStatus)
	case WithdrawalSequenceCashFirst:
		return cm.executeCashFirstWithdrawal(accounts, targetAmount, currentMonth)
	default:
		return cm.executeConventionalWithdrawal(accounts, targetAmount, currentMonth)
	}
}

// executeConventionalWithdrawal implements "Conventional" strategy: Taxable -> Tax-Deferred -> Roth
func (cm *CashManager) executeConventionalWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int) (LotSaleResult, float64) {
	simLogVerbose("CONVENTIONAL-WITHDRAWAL ENTRY: Target $%.0f", targetAmount)

	totalResult := LotSaleResult{
		SoldLots:         []TaxLot{},
		SaleTransactions: []SaleTransaction{},
	}

	remainingNeeded := targetAmount
	cashWithdrawn := 0.0

	// Step 1: Use available cash first
	if remainingNeeded > 0 && accounts.Cash > 0 {
		cashUsed := math.Min(remainingNeeded, accounts.Cash)
		accounts.Cash -= cashUsed
		cashWithdrawn += cashUsed
		remainingNeeded -= cashUsed
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 1: Used $%.0f cash, remaining $%.0f", cashUsed, remainingNeeded)
	}

	// Step 2: Sell from taxable account (generates capital gains tax)
	if taxableAccount := GetTaxableAccount(accounts); remainingNeeded > 0 && taxableAccount != nil && taxableAccount.TotalValue > 0 {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 2: Selling from taxable account, value $%.0f", taxableAccount.TotalValue)
		taxableResult := cm.SellAssetsFromAccountFIFO(taxableAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxableResult)
		remainingNeeded -= taxableResult.TotalProceeds
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 2: Sold $%.0f from taxable, remaining $%.0f", taxableResult.TotalProceeds, remainingNeeded)
	} else {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 2: SKIPPED - taxableAccount nil=%v, remainingNeeded=%.0f, totalValue=%.0f",
			taxableAccount == nil, remainingNeeded, func() float64 {
				if taxableAccount != nil {
					return taxableAccount.TotalValue
				} else {
					return 0
				}
			}())
	}

	// Step 3: Withdraw from tax-deferred account (generates ordinary income tax)
	if taxDeferredAccount := GetTaxDeferredAccount(accounts); remainingNeeded > 0 && taxDeferredAccount != nil && taxDeferredAccount.TotalValue > 0 {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 3: Selling from tax-deferred account, value $%.0f", taxDeferredAccount.TotalValue)
		taxDeferredResult := cm.SellAssetsFromAccountFIFO(taxDeferredAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxDeferredResult)
		remainingNeeded -= taxDeferredResult.TotalProceeds
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 3: Sold $%.0f from tax-deferred, remaining $%.0f", taxDeferredResult.TotalProceeds, remainingNeeded)
	} else {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 3: SKIPPED - taxDeferredAccount nil=%v, remainingNeeded=%.0f, totalValue=%.0f",
			taxDeferredAccount == nil, remainingNeeded, func() float64 {
				if taxDeferredAccount != nil {
					return taxDeferredAccount.TotalValue
				} else {
					return 0
				}
			}())
	}

	// Step 4: Withdraw from Roth account (tax-free, but should be last resort)
	if rothAccount := GetRothAccount(accounts); remainingNeeded > 0 && rothAccount != nil && rothAccount.TotalValue > 0 {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 4: Selling from Roth account, value $%.0f", rothAccount.TotalValue)
		rothResult := cm.SellAssetsFromAccountFIFO(rothAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, rothResult)
		remainingNeeded -= rothResult.TotalProceeds
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 4: Sold $%.0f from Roth, remaining $%.0f", rothResult.TotalProceeds, remainingNeeded)
	} else {
		simLogVerbose("CONVENTIONAL-WITHDRAWAL Step 4: SKIPPED - rothAccount nil=%v, remainingNeeded=%.0f, totalValue=%.0f",
			rothAccount == nil, remainingNeeded, func() float64 {
				if rothAccount != nil {
					return rothAccount.TotalValue
				} else {
					return 0
				}
			}())
	}

	totalRaised := totalResult.TotalProceeds + cashWithdrawn
	simLogVerbose("CONVENTIONAL-WITHDRAWAL FINAL: TotalProceeds $%.0f, cashWithdrawn $%.0f, totalRaised $%.0f", totalResult.TotalProceeds, cashWithdrawn, totalRaised)
	return totalResult, totalRaised
}

// executeRothMaximizationWithdrawal implements "Roth Maximization" strategy: Tax-Deferred -> Taxable -> Roth
func (cm *CashManager) executeRothMaximizationWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int) (LotSaleResult, float64) {
	totalResult := LotSaleResult{
		SoldLots:         []TaxLot{},
		SaleTransactions: []SaleTransaction{},
	}

	remainingNeeded := targetAmount
	cashWithdrawn := 0.0

	// Step 1: Use available cash first
	if remainingNeeded > 0 && accounts.Cash > 0 {
		cashUsed := math.Min(remainingNeeded, accounts.Cash)
		accounts.Cash -= cashUsed
		cashWithdrawn += cashUsed
		remainingNeeded -= cashUsed
	}

	// Step 2: Withdraw from tax-deferred account first (deplete pre-tax funds to maximize Roth legacy)
	if taxDeferredAccount := GetTaxDeferredAccount(accounts); remainingNeeded > 0 && taxDeferredAccount != nil && taxDeferredAccount.TotalValue > 0 {
		taxDeferredResult := cm.SellAssetsFromAccountFIFO(taxDeferredAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxDeferredResult)
		remainingNeeded -= taxDeferredResult.TotalProceeds
	}

	// Step 3: Sell from taxable account
	if taxableAccount := GetTaxableAccount(accounts); remainingNeeded > 0 && taxableAccount != nil && taxableAccount.TotalValue > 0 {
		taxableResult := cm.SellAssetsFromAccountFIFO(taxableAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxableResult)
		remainingNeeded -= taxableResult.TotalProceeds
	}

	// Step 4: Withdraw from Roth account as last resort
	if rothAccount := GetRothAccount(accounts); remainingNeeded > 0 && rothAccount != nil && rothAccount.TotalValue > 0 {
		rothResult := cm.SellAssetsFromAccountFIFO(rothAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, rothResult)
		remainingNeeded -= rothResult.TotalProceeds
	}

	return totalResult, totalResult.TotalProceeds + cashWithdrawn
}

// executeTaxBracketAwareWithdrawal implements "Tax-Bracket Aware" strategy
func (cm *CashManager) executeTaxBracketAwareWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int, ytdOrdinaryIncome float64, filingStatus FilingStatus) (LotSaleResult, float64) {
	totalResult := LotSaleResult{
		SoldLots:         []TaxLot{},
		SaleTransactions: []SaleTransaction{},
	}

	remainingNeeded := targetAmount
	cashWithdrawn := 0.0

	// Step 1: Use available cash first
	if remainingNeeded > 0 && accounts.Cash > 0 {
		cashUsed := math.Min(remainingNeeded, accounts.Cash)
		accounts.Cash -= cashUsed
		cashWithdrawn += cashUsed
		remainingNeeded -= cashUsed
	}

	// Step 2: Tax bracket aware strategy - calculate optimal tax-deferred withdrawal
	// Use actual tax calculations to determine how much we can withdraw while staying in lower brackets
	if taxDeferredAccount := GetTaxDeferredAccount(accounts); remainingNeeded > 0 && taxDeferredAccount != nil && taxDeferredAccount.TotalValue > 0 {
		maxTaxDeferredWithdrawal := cm.calculateOptimalTaxDeferredWithdrawal(remainingNeeded, ytdOrdinaryIncome, filingStatus)
		taxDeferredAmount := math.Min(maxTaxDeferredWithdrawal, taxDeferredAccount.TotalValue)

		if taxDeferredAmount > 0 {
			taxDeferredResult := cm.SellAssetsFromAccountFIFO(taxDeferredAccount, taxDeferredAmount, currentMonth)
			cm.mergeSaleResults(&totalResult, taxDeferredResult)
			remainingNeeded -= taxDeferredResult.TotalProceeds
		}
	}

	// Step 3: Use taxable for remaining amount
	if taxableAccount := GetTaxableAccount(accounts); remainingNeeded > 0 && taxableAccount != nil && taxableAccount.TotalValue > 0 {
		taxableResult := cm.SellAssetsFromAccountFIFO(taxableAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxableResult)
		remainingNeeded -= taxableResult.TotalProceeds
	}

	// Step 4: Withdraw remaining from tax-deferred if needed
	if taxDeferredAccount := GetTaxDeferredAccount(accounts); remainingNeeded > 0 && taxDeferredAccount != nil && taxDeferredAccount.TotalValue > 0 {
		taxDeferredResult := cm.SellAssetsFromAccountFIFO(taxDeferredAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, taxDeferredResult)
		remainingNeeded -= taxDeferredResult.TotalProceeds
	}

	// Step 5: Withdraw from Roth account as last resort
	if rothAccount := GetRothAccount(accounts); remainingNeeded > 0 && rothAccount != nil && rothAccount.TotalValue > 0 {
		rothResult := cm.SellAssetsFromAccountFIFO(rothAccount, remainingNeeded, currentMonth)
		cm.mergeSaleResults(&totalResult, rothResult)
		remainingNeeded -= rothResult.TotalProceeds
	}

	return totalResult, totalResult.TotalProceeds + cashWithdrawn
}

// executeCashFirstWithdrawal implements cash-first strategy
func (cm *CashManager) executeCashFirstWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int) (LotSaleResult, float64) {
	totalResult := LotSaleResult{
		SoldLots:         []TaxLot{},
		SaleTransactions: []SaleTransaction{},
	}

	remainingNeeded := targetAmount
	cashWithdrawn := 0.0

	// Step 1: Deplete all available cash first
	if remainingNeeded > 0 && accounts.Cash > 0 {
		cashUsed := math.Min(remainingNeeded, accounts.Cash)
		accounts.Cash -= cashUsed
		cashWithdrawn += cashUsed
		remainingNeeded -= cashUsed
	}

	// Step 2: If cash is insufficient, use proportional withdrawal from investment accounts
	if remainingNeeded > 0 {
		totalInvestmentValue := 0.0
		taxableAccount := GetTaxableAccount(accounts)
		taxDeferredAccount := GetTaxDeferredAccount(accounts)
		rothAccount := GetRothAccount(accounts)

		if taxableAccount != nil {
			totalInvestmentValue += taxableAccount.TotalValue
		}
		if taxDeferredAccount != nil {
			totalInvestmentValue += taxDeferredAccount.TotalValue
		}
		if rothAccount != nil {
			totalInvestmentValue += rothAccount.TotalValue
		}

		if totalInvestmentValue > 0 {
			// Proportional withdrawal based on account values
			if taxableAccount != nil && taxableAccount.TotalValue > 0 {
				proportion := taxableAccount.TotalValue / totalInvestmentValue
				withdrawAmount := remainingNeeded * proportion
				if withdrawAmount > 0 {
					taxableResult := cm.SellAssetsFromAccountFIFO(taxableAccount, withdrawAmount, currentMonth)
					cm.mergeSaleResults(&totalResult, taxableResult)
					remainingNeeded -= taxableResult.TotalProceeds
				}
			}

			if remainingNeeded > 0 && taxDeferredAccount != nil && taxDeferredAccount.TotalValue > 0 {
				proportion := taxDeferredAccount.TotalValue / totalInvestmentValue
				withdrawAmount := remainingNeeded * proportion
				if withdrawAmount > 0 {
					taxDeferredResult := cm.SellAssetsFromAccountFIFO(taxDeferredAccount, withdrawAmount, currentMonth)
					cm.mergeSaleResults(&totalResult, taxDeferredResult)
					remainingNeeded -= taxDeferredResult.TotalProceeds
				}
			}

			if remainingNeeded > 0 && rothAccount != nil && rothAccount.TotalValue > 0 {
				rothResult := cm.SellAssetsFromAccountFIFO(rothAccount, remainingNeeded, currentMonth)
				cm.mergeSaleResults(&totalResult, rothResult)
				remainingNeeded -= rothResult.TotalProceeds
			}
		}
	}

	return totalResult, totalResult.TotalProceeds + cashWithdrawn
}

// mergeSaleResults combines multiple sale results
func (cm *CashManager) mergeSaleResults(destination *LotSaleResult, source LotSaleResult) {
	destination.TotalProceeds += source.TotalProceeds
	destination.TotalCostBasis += source.TotalCostBasis
	destination.TotalRealizedGains += source.TotalRealizedGains
	destination.ShortTermGains += source.ShortTermGains
	destination.LongTermGains += source.LongTermGains
	destination.SoldLots = append(destination.SoldLots, source.SoldLots...)
	destination.SaleTransactions = append(destination.SaleTransactions, source.SaleTransactions...)
}

// SellSpecificAssetClassFIFO sells a specific asset class using FIFO
func (cm *CashManager) SellSpecificAssetClassFIFO(accounts *AccountHoldingsMonthEnd, assetClass AssetClass, targetAmount float64, currentMonth int) LotSaleResult {
	result := LotSaleResult{
		SoldLots:         []TaxLot{},
		SaleTransactions: []SaleTransaction{},
	}

	accountSlice := []*Account{GetTaxableAccount(accounts), GetTaxDeferredAccount(accounts), GetRothAccount(accounts)}
	remainingToSell := targetAmount

	for _, account := range accountSlice {
		if account == nil || remainingToSell <= 0 {
			continue
		}

		for i := range account.Holdings {
			if account.Holdings[i].AssetClass == assetClass && remainingToSell > 0 {
				sellAmount := math.Min(remainingToSell, account.Holdings[i].CurrentMarketValueTotal)
				if sellAmount > 0 {
					saleResult := cm.SellAssetsFromAccountFIFO(account, sellAmount, currentMonth)
					cm.mergeSaleResults(&result, saleResult)
					remainingToSell -= saleResult.TotalProceeds
				}
			}
		}
	}

	return result
}

// GetTaxLossHarvestingCandidates identifies holdings with unrealized losses
func (cm *CashManager) GetTaxLossHarvestingCandidates(accounts *AccountHoldingsMonthEnd, currentMonth int) []Holding {
	var candidates []Holding

	taxableAccount := GetTaxableAccount(accounts)
	if taxableAccount == nil {
		return candidates
	}

	for _, holding := range taxableAccount.Holdings {
		if holding.UnrealizedGainLossTotal < 0 {
			// Check if we're outside wash sale period
			canHarvest := true
			for _, lot := range holding.Lots {
				if lot.WashSalePeriodEnd > currentMonth {
					canHarvest = false
					break
				}
			}

			if canHarvest {
				candidates = append(candidates, holding)
			}
		}
	}

	return candidates
}

// NOTE: CalculateCapitalGainsTaxForSale has been removed for mathematical accuracy.
// Capital gains tax calculation is now handled centrally in ProcessAnnualTaxes
// using the proper progressive tax system in TaxCalculator.

// NOTE: Redundant tax calculation functions removed for mathematical accuracy.
// All asset sales now use SellAssetsFromAccountFIFO() which properly tracks capital gains
// in LotSaleResult for year-end progressive tax calculation via ProcessCapitalGainsWithTermDifferentiation().

// ExecuteTaxLossHarvesting executes tax-loss harvesting with wash sale compliance and performance optimization
func (cm *CashManager) ExecuteTaxLossHarvesting(accounts *AccountHoldingsMonthEnd, maxLossToHarvest float64, currentMonth int) LotSaleResult {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0, 5),
		SaleTransactions: make([]SaleTransaction, 0, 5),
	}

	taxableAccount := GetTaxableAccount(accounts)
	if taxableAccount == nil || maxLossToHarvest <= 0 {
		return result
	}

	candidates := cm.GetTaxLossHarvestingCandidates(accounts, currentMonth)
	if len(candidates) == 0 {
		return result
	}

	remainingToHarvest := maxLossToHarvest

	// Sort candidates by loss amount (largest losses first) with stable sort
	sort.SliceStable(candidates, func(i, j int) bool {
		return candidates[i].UnrealizedGainLossTotal < candidates[j].UnrealizedGainLossTotal
	})

	for _, holding := range candidates {
		if remainingToHarvest <= 0 {
			break
		}

		potentialLoss := math.Abs(holding.UnrealizedGainLossTotal)
		lossToHarvest := math.Min(remainingToHarvest, potentialLoss)

		if lossToHarvest > 0 {
			// Calculate how much to sell to realize this loss
			sellAmount := (lossToHarvest / potentialLoss) * holding.CurrentMarketValueTotal

			saleResult := cm.SellAssetsFromAccountFIFO(taxableAccount, sellAmount, currentMonth)
			cm.mergeSaleResults(&result, saleResult)

			// Set wash sale period for this asset class (30 days = ~1 month)
			cm.setWashSalePeriod(accounts, holding.AssetClass, currentMonth+1)

			remainingToHarvest -= math.Abs(saleResult.TotalRealizedGains)
		}
	}

	return result
}

// setWashSalePeriod sets wash sale period for an asset class
func (cm *CashManager) setWashSalePeriod(accounts *AccountHoldingsMonthEnd, assetClass AssetClass, washSaleEndMonth int) {
	accountSlice := []*Account{GetTaxableAccount(accounts), GetTaxDeferredAccount(accounts), GetRothAccount(accounts)}

	for _, account := range accountSlice {
		if account == nil {
			continue
		}

		for i := range account.Holdings {
			if account.Holdings[i].AssetClass == assetClass {
				for j := range account.Holdings[i].Lots {
					account.Holdings[i].Lots[j].WashSalePeriodEnd = washSaleEndMonth
				}
			}
		}
	}
}

// CalculateOptimalWithdrawal calculates the most tax-efficient withdrawal strategy
func (cm *CashManager) CalculateOptimalWithdrawal(accounts *AccountHoldingsMonthEnd, targetAmount float64, currentMonth int, taxBracket float64) WithdrawalSequence {
	// Simple heuristic for now - use tax-efficient sequence
	// In a full implementation, this would consider:
	// - Current tax bracket
	// - Capital gains rates
	// - Future RMD requirements
	// - Estate planning considerations

	if taxBracket <= 0.12 {
		// Low tax bracket - might want to realize some gains now
		return WithdrawalSequenceTaxEfficient
	} else if taxBracket >= 0.32 {
		// High tax bracket - avoid tax-deferred withdrawals
		return WithdrawalSequenceCashFirst
	}

	return WithdrawalSequenceTaxEfficient
}

// isLotsSorted checks if lots are already sorted by acquisition date (performance optimization)
func (cm *CashManager) isLotsSorted(lots []TaxLot) bool {
	if len(lots) <= 1 {
		return true
	}

	for i := 1; i < len(lots); i++ {
		if lots[i].AcquisitionDate < lots[i-1].AcquisitionDate {
			return false
		}
	}
	return true
}

// OptimizeLotStructure removes zero-quantity lots and consolidates similar lots for performance
func (cm *CashManager) OptimizeLotStructure(account *Account) {
	if account == nil {
		return
	}

	for i := range account.Holdings {
		holding := &account.Holdings[i]

		// PERF: In-place filter to avoid allocating a new slice
		n := 0
		for j := range holding.Lots {
			if holding.Lots[j].Quantity > 1e-10 { // Small tolerance for floating point precision
				if n != j {
					holding.Lots[n] = holding.Lots[j]
				}
				n++
			}
		}
		holding.Lots = holding.Lots[:n]

		// NOTE: Do NOT call updateHoldingTotals here!
		// It would recalculate CurrentMarketValueTotal using CashManager's market prices,
		// which may differ from the holding's stored prices (causing value inflation).
		// Prices should only be updated during MARKET_UPDATE events with correct returns.
	}
}

// calculateOptimalTaxDeferredWithdrawal calculates how much to withdraw from tax-deferred
// accounts to minimize tax impact using actual tax bracket analysis
func (cm *CashManager) calculateOptimalTaxDeferredWithdrawal(targetAmount float64, ytdOrdinaryIncome float64, filingStatus FilingStatus) float64 {
	// If income data is missing (negative), treat as zero income scenario
	// This allows us to use the full standard deduction space for withdrawals
	if ytdOrdinaryIncome < 0 {
		ytdOrdinaryIncome = 0
		simLogVerbose("TAX-AWARE WITHDRAWAL: No YTD income data, treating as $0 income for optimal withdrawal calculation")
	}

	// Create tax calculator for bracket analysis
	taxConfig := TaxConfigDetailed{
		FilingStatus:      filingStatus,
		State:             "CA", // Conservative state choice - can be parameterized later
		StandardDeduction: GetStandardDeductionFromConfig(filingStatus),
		ItemizedDeduction: 0, // Conservative assumption
		SaltCap:           10000, // 2024 SALT cap
	}
	taxCalculator := NewTaxCalculator(taxConfig, nil)

	// Calculate current taxable income after standard deduction
	currentTaxableIncome := math.Max(0, ytdOrdinaryIncome-taxConfig.StandardDeduction)

	// Calculate current tax to find marginal rate
	currentTax := taxCalculator.CalculateFederalIncomeTax(currentTaxableIncome)

	// Test incremental tax to find current marginal rate
	testAmount := 1000.0
	testTaxableIncome := currentTaxableIncome + testAmount
	testTax := taxCalculator.CalculateFederalIncomeTax(testTaxableIncome)
	currentMarginalRate := (testTax - currentTax) / testAmount

	// Get federal tax brackets to determine bracket boundaries
	brackets := GetFederalTaxBrackets(filingStatus)

	// Find current bracket and calculate space remaining in favorable tax brackets
	var optimalWithdrawal float64 = targetAmount // Default to full amount needed

	// Strategy: Use available space in brackets up to 12% rate, be conservative above that
	for _, bracket := range brackets {
		// If we're in or below the 12% bracket, use available space
		if bracket.Rate <= 0.12 && currentTaxableIncome < bracket.IncomeMax {
			bracketCapacity := bracket.IncomeMax - math.Max(bracket.IncomeMin, currentTaxableIncome)
			if bracketCapacity > 0 {
				// We have space in this favorable bracket - use it
				optimalWithdrawal = math.Min(targetAmount, bracketCapacity)
				simLogVerbose("TAX-AWARE WITHDRAWAL: Found $%.0f space in %.1f%% bracket, recommending withdrawal of $%.0f",
					bracketCapacity, bracket.Rate*100, optimalWithdrawal)
				break
			}
		} else if bracket.Rate > 0.12 && currentTaxableIncome >= bracket.IncomeMin {
			// We're in a higher bracket (>12%) - be conservative to avoid bracket creep
			conservativeLimit := math.Min(targetAmount, 5000.0) // Conservative monthly limit
			optimalWithdrawal = conservativeLimit
			simLogVerbose("TAX-AWARE WITHDRAWAL: Already in %.1f%% bracket, limiting withdrawal to $%.0f to avoid bracket creep",
				bracket.Rate*100, optimalWithdrawal)
			break
		}
	}

	// Safety check: If marginal rate is very high (>22%), reduce withdrawal significantly
	if currentMarginalRate > 0.22 {
		safeguardWithdrawal := math.Min(optimalWithdrawal, targetAmount * 0.5)
		simLogVerbose("TAX-AWARE WITHDRAWAL: High marginal rate %.1f%% detected, reducing withdrawal from $%.0f to $%.0f",
			currentMarginalRate*100, optimalWithdrawal, safeguardWithdrawal)
		optimalWithdrawal = safeguardWithdrawal
	}

	// Additional safety: Never recommend more than $10k per month to avoid extreme tax consequences
	if optimalWithdrawal > 10000.0 {
		optimalWithdrawal = 10000.0
		simLogVerbose("TAX-AWARE WITHDRAWAL: Capping withdrawal at $10,000 monthly safety limit")
	}

	simLogVerbose("TAX-AWARE WITHDRAWAL CALCULATION: YTD Income=$%.0f, Taxable Income=$%.0f, Marginal Rate=%.1f%%, Optimal Withdrawal=$%.0f",
		ytdOrdinaryIncome, currentTaxableIncome, currentMarginalRate*100, optimalWithdrawal)

	return optimalWithdrawal
}

// SellSpecificAssetClassFromAccount sells only the specified asset class from a single account using FIFO
// ENHANCEMENT: Enables asset class specific withdrawals for precise tax optimization
func (cm *CashManager) SellSpecificAssetClassFromAccount(account *Account, targetAssetClass AssetClass, targetAmount float64, currentMonth int) LotSaleResult {
	result := LotSaleResult{
		SoldLots:         make([]TaxLot, 0, 10),
		SaleTransactions: make([]SaleTransaction, 0, 10),
	}

	if account == nil || targetAmount <= 0 {
		simLogVerbose("ASSET-CLASS-WITHDRAWAL: Early exit - account nil=%v, targetAmount=%.2f", account == nil, targetAmount)
		return result
	}

	simLogVerbose("ASSET-CLASS-WITHDRAWAL: Selling $%.2f from %s asset class", targetAmount, targetAssetClass)

	remainingToSell := targetAmount

	// Find holdings that match the target asset class and sell using FIFO
	for i := range account.Holdings {
		holding := &account.Holdings[i]

		// Skip holdings that don't match the target asset class
		if holding.AssetClass != targetAssetClass {
			continue
		}

		if remainingToSell <= 0 || len(holding.Lots) == 0 {
			continue
		}

		// Sort lots by acquisition date (FIFO) if not already sorted
		if !cm.isLotsSorted(holding.Lots) {
			sort.Slice(holding.Lots, func(i, j int) bool {
				return holding.Lots[i].AcquisitionDate < holding.Lots[j].AcquisitionDate
			})
		}

		// Get current market price for this asset class
		currentPrice, err := cm.getPricePerShare(holding.AssetClass, cm.marketPrices)
		if err != nil {
			simLogVerbose("ASSET-CLASS-WITHDRAWAL ERROR: %v", err)
			continue
		}
		if currentPrice <= 0 {
			simLogVerbose("ASSET-CLASS-WITHDRAWAL WARNING: Invalid price for %s: %.6f", holding.AssetClass, currentPrice)
			continue
		}

		// Sell lots in FIFO order
		lotsToRemove := []int{}
		for j, lot := range holding.Lots {
			if remainingToSell <= 0 {
				break
			}

			lotValue := lot.Quantity * currentPrice
			sellAmount := math.Min(remainingToSell, lotValue)
			sellQuantity := sellAmount / currentPrice

			if sellQuantity > 0 {
				// Create sale transaction
				saleResult := cm.createSaleTransaction(lot, sellQuantity, currentPrice, currentMonth)
				result.SaleTransactions = append(result.SaleTransactions, saleResult)

				simLogVerbose("🔍 ASSET-CLASS SALE: Asset=%s, Quantity=%.2f, SalePrice=%.2f, Proceeds=%.2f, Gain=%.2f",
					saleResult.AssetClass, sellQuantity, currentPrice, saleResult.Proceeds, saleResult.RealizedGainLoss)

				// Update totals
				result.TotalProceeds += saleResult.Proceeds
				result.TotalCostBasis += saleResult.CostBasis
				result.TotalRealizedGains += saleResult.RealizedGainLoss

				if saleResult.RealizedGainLoss > 0 { // Only positive gains
					if saleResult.IsLongTerm {
						result.LongTermGains += saleResult.RealizedGainLoss
					} else {
						result.ShortTermGains += saleResult.RealizedGainLoss
					}
				}

				// Update lot
				if sellQuantity >= lot.Quantity {
					// Completely sold this lot
					result.SoldLots = append(result.SoldLots, lot)
					lotsToRemove = append(lotsToRemove, j)
				} else {
					// Partially sold this lot - create a new lot representing the sold portion
					partialLot := TaxLot{
						ID:                lot.ID + "_partial_" + strconv.Itoa(cm.nextLotID),
						AssetClass:        lot.AssetClass,
						Quantity:          sellQuantity,
						CostBasisPerUnit:  lot.CostBasisPerUnit,
						CostBasisTotal:    lot.CostBasisPerUnit * sellQuantity,
						AcquisitionDate:   lot.AcquisitionDate,
						IsLongTerm:        lot.IsLongTerm,
						WashSalePeriodEnd: lot.WashSalePeriodEnd,
					}
					cm.nextLotID++
					result.SoldLots = append(result.SoldLots, partialLot)

					// Update remaining lot
					holding.Lots[j].Quantity -= sellQuantity
					holding.Lots[j].CostBasisTotal -= partialLot.CostBasisTotal
				}

				remainingToSell -= sellAmount
			}
		}

		// Remove completely sold lots efficiently using slice filtering
		if len(lotsToRemove) > 0 {
			newLots := make([]TaxLot, 0, len(holding.Lots)-len(lotsToRemove))
			removeMap := make(map[int]bool, len(lotsToRemove))
			for _, idx := range lotsToRemove {
				removeMap[idx] = true
			}

			for j, lot := range holding.Lots {
				if !removeMap[j] {
					newLots = append(newLots, lot)
				}
			}
			holding.Lots = newLots
		}

		// Update holding totals
		cm.updateHoldingTotals(holding)

		// Check if we've satisfied the withdrawal amount
		if remainingToSell <= 0 {
			break
		}
	}

	// Initialize net proceeds to gross proceeds (will be adjusted for taxable accounts)
	result.NetProceeds = result.TotalProceeds

	// Update account total value
	account.TotalValue -= result.TotalProceeds

	if remainingToSell > 0.01 { // Small tolerance for rounding
		simLogVerbose("ASSET-CLASS-WITHDRAWAL WARNING: Could only sell $%.2f of requested $%.2f from %s",
			targetAmount - remainingToSell, targetAmount, targetAssetClass)
	}

	simLogVerbose("ASSET-CLASS-WITHDRAWAL EXIT: TotalProceeds=%.2f, NetProceeds=%.2f from %s",
		result.TotalProceeds, result.NetProceeds, targetAssetClass)

	return result
}
