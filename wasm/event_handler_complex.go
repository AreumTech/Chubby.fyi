package main

import "fmt"

// RebalancePortfolioEventHandler handles portfolio rebalancing events
type RebalancePortfolioEventHandler struct{}

func (h *RebalancePortfolioEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Rebalance portfolio across accounts
	se.processPortfolioRebalance(event, accounts)

	return nil
}

// TaxLossHarvestingSaleEventHandler handles tax loss harvesting sale events
type TaxLossHarvestingSaleEventHandler struct{}

func (h *TaxLossHarvestingSaleEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Execute tax-loss harvesting sale using strategy processor
	settings := TaxLossHarvestingSettings{
		Enabled:                 true,
		MaxAnnualLossHarvest:    3000.0,
		MinimumLossThreshold:    100.0,
		WashSaleAvoidancePeriod: 31,
	}
	saleResult, err := se.strategyProcessor.ProcessTaxLossHarvesting(accounts, settings, currentMonth)
	if err == nil {
		accounts.Cash += saleResult.TotalProceeds
		*cashFlow += saleResult.TotalProceeds
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
	}

	return err
}

// StrategicCapitalGainsRealizationEventHandler handles strategic capital gains realization events
type StrategicCapitalGainsRealizationEventHandler struct{}

func (h *StrategicCapitalGainsRealizationEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine
	currentMonth := context.CurrentMonth

	// Realize capital gains strategically using strategy processor
	settings := StrategicCapitalGainsSettings{
		Enabled:             true,
		TargetTaxBracket:    0.0, // Target 0% LTCG bracket
		MaxGainsPerYear:     event.Amount,
		MinGainThreshold:    100.0,
		AllowShortTermGains: false,
	}
	taxContext := AdvancedTaxContext{
		OrdinaryIncomeYTD:        se.ordinaryIncomeYTD,
		LongTermCapitalGainsYTD:  se.longTermCapitalGainsYTD,
		ShortTermCapitalGainsYTD: se.shortTermCapitalGainsYTD,
	}
	saleResult, err := se.strategyProcessor.ProcessStrategicCapitalGains(accounts, settings, taxContext, currentMonth)
	if err == nil {
		accounts.Cash += saleResult.TotalProceeds
		*cashFlow += saleResult.TotalProceeds
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)
	}

	return err
}

// HealthcareCostEventHandler handles healthcare cost events
type HealthcareCostEventHandler struct{}

func (h *HealthcareCostEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process healthcare expenses
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount
	// Healthcare costs may be tax-deductible
	se.processHealthcareExpense(event.Amount, event.Metadata)

	return nil
}

// QualifiedCharitableDistributionEventHandler handles QCD events
type QualifiedCharitableDistributionEventHandler struct{}

func (h *QualifiedCharitableDistributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process QCD from IRA
	se.processQualifiedCharitableDistribution(event, accounts, cashFlow)

	return nil
}

// AdjustCashReserveSellAssetsEventHandler handles selling assets to meet cash targets
type AdjustCashReserveSellAssetsEventHandler struct{}

func (h *AdjustCashReserveSellAssetsEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Sell assets to meet cash reserve target
	se.processAdjustCashReserveSell(event, accounts, cashFlow)

	return nil
}

// AdjustCashReserveBuyAssetsEventHandler handles buying assets with excess cash
type AdjustCashReserveBuyAssetsEventHandler struct{}

func (h *AdjustCashReserveBuyAssetsEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Buy assets with excess cash
	se.processAdjustCashReserveBuy(event, accounts, cashFlow)

	return nil
}

// GoalDefineEventHandler handles goal definition events
type GoalDefineEventHandler struct{}

func (h *GoalDefineEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Goal definition events don't affect simulation directly
	// Store in metadata for tracking purposes
	return nil
}

// RequiredMinimumDistributionEventHandler handles manual RMD events
type RequiredMinimumDistributionEventHandler struct{}

func (h *RequiredMinimumDistributionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process manual RMD (in addition to automatic December RMDs)
	se.processManualRMD(event, accounts, cashFlow)

	return nil
}

// AnnuityPaymentEventHandler handles annuity payment events
type AnnuityPaymentEventHandler struct{}

func (h *AnnuityPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process annuity payments
	accounts.Cash += event.Amount
	*cashFlow += event.Amount
	// Track monthly flow
	se.currentMonthFlows.IncomeThisMonth += event.Amount
	// Annuity payments are typically taxable
	se.ProcessIncome(event.Amount, false, 0)

	return nil
}

// TaxLossHarvestingCheckAndExecuteEventHandler handles tax loss harvesting check and execute events
type TaxLossHarvestingCheckAndExecuteEventHandler struct{}

func (h *TaxLossHarvestingCheckAndExecuteEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Check for tax-loss harvesting opportunities and execute
	se.processTaxLossHarvestingCheck(event, accounts, cashFlow)

	return nil
}

// ConcentrationRiskAlertEventHandler handles concentration risk monitoring events
type ConcentrationRiskAlertEventHandler struct{}

func (h *ConcentrationRiskAlertEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process concentration risk monitoring
	se.processConcentrationRiskCheck(event, accounts)

	return nil
}

// OneTimeEventEventHandler handles one-time events
type OneTimeEventEventHandler struct{}

func (h *OneTimeEventEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// One-time events can be positive (income) or negative (expense) based on amount
	se := context.SimulationEngine

	netAmount := event.Amount

	// FOOLPROOF RULE: Apply withholding for positive amounts (income) with taxProfile
	// IRS supplemental wage withholding: 22% flat rate (or 37% for amounts > $1M)
	if event.Amount > 0 {
		taxProfile := getStringFromMetadata(event.Metadata, "taxProfile", "")
		if taxProfile == "" && event.TaxProfile != nil {
			taxProfile = *event.TaxProfile // Check direct field (pointer)
		}

		if taxProfile == "ordinary_income" {
			var withholdingRate float64
			if event.Amount > 1000000 {
				withholdingRate = 0.37 // 37% for amounts over $1M
			} else {
				withholdingRate = 0.22 // 22% flat supplemental rate
			}
			withholding := event.Amount * withholdingRate
			netAmount = event.Amount - withholding

			// Track withholding for year-end reconciliation
			se.taxWithholdingYTD += withholding

			simLogEvent("ONE-TIME-INCOME: %s gross=$%.2f, withholding=$%.2f (%.0f%%), net=$%.2f",
				event.Description, event.Amount, withholding, withholdingRate*100, netAmount)
		}
	}

	// Add the net amount to cash (positive = income, negative = expense)
	accounts.Cash += netAmount
	*cashFlow += netAmount
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += netAmount

	return nil
}

// LiabilityAddEventHandler handles liability addition events
type LiabilityAddEventHandler struct{}

func (h *LiabilityAddEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Create liability from event with proper error handling
	liability, err := CreateLiabilityFromEvent(event)
	if err != nil {
		return fmt.Errorf("failed to create liability from event %s: %v", event.ID, err)
	}

	// Add liability to simulation engine tracking
	se.liabilities = append(se.liabilities, liability)

	// For loan origination, add the principal amount to cash (loan proceeds)
	// This represents receiving the borrowed money
	accounts.Cash += liability.CurrentPrincipalBalance
	*cashFlow += liability.CurrentPrincipalBalance

	simLogVerbose("LIABILITY-ADD: Created %s liability for $%.2f, monthly payment $%.2f for %d months",
		liability.Type, liability.CurrentPrincipalBalance, liability.MonthlyPayment, liability.TermRemainingMonths)

	return nil
}

// LiabilityPaymentEventHandler handles liability payment events
type LiabilityPaymentEventHandler struct{}

func (h *LiabilityPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Process debt payment
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount
	se.currentMonthFlows.DebtPaymentsPrincipalThisMonth += event.Amount

	return nil
}

// DebtPaymentEventHandler handles debt payment events
type DebtPaymentEventHandler struct{}

func (h *DebtPaymentEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Similar to liability payment
	accounts.Cash -= event.Amount
	*cashFlow -= event.Amount
	se.currentMonthFlows.DebtPaymentsPrincipalThisMonth += event.Amount

	return nil
}

// StrategyAssetAllocationSetEventHandler handles asset allocation strategy events
type StrategyAssetAllocationSetEventHandler struct{}

func (h *StrategyAssetAllocationSetEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Strategy setting events don't directly affect cash flow
	// They would modify strategy processor settings
	return nil
}

// StrategyRebalancingRuleSetEventHandler handles rebalancing rule strategy events
type StrategyRebalancingRuleSetEventHandler struct{}

func (h *StrategyRebalancingRuleSetEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Extract strategy settings from event metadata
	var strategySettings StrategySettings
	if event.Metadata != nil {
		// Try to extract embedded strategy settings from metadata
		if settings, ok := event.Metadata["strategySettings"].(StrategySettings); ok {
			strategySettings = settings
		} else {
			// Fall back to parsing individual parameters
			strategySettings = getDefaultStrategySettings()

			// Override default threshold if provided
			if threshold, ok := event.Metadata["rebalanceThreshold"].(float64); ok {
				strategySettings.Rebalancing.ThresholdPercentage = threshold
			}

			// Override asset allocation if provided
			if allocations, ok := event.Metadata["assetAllocation"].(map[AssetClass]float64); ok {
				strategySettings.AssetAllocation.Allocations = allocations
			}
		}
	} else {
		strategySettings = getDefaultStrategySettings()
	}

	// Use event generator to create atomic rebalancing events
	generator := &RebalancingEventGenerator{}
	newEvents, err := generator.GenerateEvents(accounts, strategySettings, context.CurrentMonth, se)
	if err != nil {
		return fmt.Errorf("failed to generate rebalancing events: %v", err)
	}

	// Add generated events to the event queue for processing
	if len(newEvents) > 0 {
		// Use queue injection mechanism to add events
		se.InjectQueuedEvents(newEvents)
		simLogVerbose("STRATEGY-EVENT: Injected %d rebalancing events for month %d", len(newEvents), context.CurrentMonth)
	}

	return nil
}

// InitialStateEventHandler handles initial state events
// NOTE: The actual initialization of accounts happens in SimulationEngine.RunSingleSimulation
// where input.InitialAccounts are copied to preserve holdings and tax lots.
// This handler is a no-op because the initialization is already complete by the time
// events are processed. The INITIAL_STATE event serves as a marker in the event stream.
type InitialStateEventHandler struct{}

func (h *InitialStateEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Initial state already set up in RunSingleSimulation - no action needed
	simLogVerbose("📋 [INITIAL_STATE] Initial accounts already initialized with Cash=$%.2f", accounts.Cash)
	return nil
}

// RealEstatePurchaseEventHandler handles real estate purchase events
type RealEstatePurchaseEventHandler struct{}

func (h *RealEstatePurchaseEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// 1. Parse property details from event metadata
	propertyDetails, ok := event.Metadata["propertyDetails"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("real estate purchase event %s missing required 'propertyDetails' metadata", event.ID)
	}

	// Extract property information with safe type assertions
	purchasePrice := event.Amount
	if purchasePrice <= 0 {
		return fmt.Errorf("invalid purchase price: %.2f", purchasePrice)
	}

	// Parse down payment (default to 20% if not specified)
	downPaymentPercent := 0.20
	if dp, ok := propertyDetails["downPaymentPercent"].(float64); ok && dp > 0 && dp <= 1.0 {
		downPaymentPercent = dp
	}

	downPaymentAmount := purchasePrice * downPaymentPercent
	mortgageAmount := purchasePrice - downPaymentAmount

	// 4. Handle down payment - check if sufficient cash available
	if accounts.Cash < downPaymentAmount {
		// Need to liquidate assets to cover down payment
		shortfall := downPaymentAmount - accounts.Cash
		simLogVerbose("💰 [REAL_ESTATE] Need to liquidate $%.2f for down payment", shortfall)

		// Use cash manager to execute withdrawal for down payment
		saleResult, actualAmount := se.cashManager.ExecuteTaxEfficientWithdrawal(accounts, shortfall, context.CurrentMonth)

		if actualAmount < shortfall {
			return fmt.Errorf("insufficient funds for real estate down payment: need $%.2f, could only raise $%.2f",
				shortfall, actualAmount)
		}

		// Process tax implications of asset sales
		se.ProcessCapitalGainsWithTermDifferentiation(saleResult.ShortTermGains, saleResult.LongTermGains)

		simLogVerbose("💸 [REAL_ESTATE] Liquidated $%.2f in assets for down payment", actualAmount)
	}

	// Deduct down payment from cash
	accounts.Cash -= downPaymentAmount
	*cashFlow -= downPaymentAmount

	// Track as major expense
	se.currentMonthFlows.ExpensesThisMonth += downPaymentAmount
	se.currentMonthFlows.OneTimeEventsImpactThisMonth -= downPaymentAmount

	// 2. Create real estate asset in holdings (add to taxable account as real estate is typically held there)
	if accounts.Taxable == nil {
		accounts.Taxable = &Account{Holdings: []Holding{}}
	}

	// CRITICAL FIX: Use true share-based model even for real estate
	// Real estate should be modeled as fractional "shares" of the property
	// with a standard price per "share" to maintain mathematical consistency
	pricePerShare := 1000.0 // $1000 per "share" of real estate (standard unit)
	sharesOwned := purchasePrice / pricePerShare

	propertyHolding := Holding{
		ID:                        fmt.Sprintf("property-%s", event.ID),
		AssetClass:                AssetClassRealEstatePrimaryHome,
		LiquidityTier:             LiquidityTierIlliquid,
		Quantity:                  sharesOwned,          // EXACT fractional shares
		CostBasisPerUnit:          pricePerShare,        // Cost per share
		CostBasisTotal:            purchasePrice,        // Total cost basis
		CurrentMarketPricePerUnit: pricePerShare,        // Current price per share
		CurrentMarketValueTotal:   purchasePrice,        // Current market value
		UnrealizedGainLossTotal:   0.0,
		Lots:                      []TaxLot{},           // Start with empty lots
	}

	// Create initial tax lot for this property with proper share-based data
	initialLot := TaxLot{
		ID:                fmt.Sprintf("lot_property_%s_%d", event.ID, context.CurrentMonth),
		AssetClass:        AssetClassRealEstatePrimaryHome,
		Quantity:          sharesOwned,               // EXACT number of shares in this lot
		CostBasisPerUnit:  pricePerShare,            // Cost per share
		CostBasisTotal:    purchasePrice,            // Total cost basis for this lot
		AcquisitionDate:   context.CurrentMonth,     // Purchase month for capital gains determination
		IsLongTerm:        false,                    // Will become long-term after 12 months
		WashSalePeriodEnd: 0,                        // No wash sale restrictions initially
	}
	propertyHolding.Lots = []TaxLot{initialLot}

	accounts.Taxable.Holdings = append(accounts.Taxable.Holdings, propertyHolding)

	// 3. Create mortgage liability if there's a mortgage
	if mortgageAmount > 0 {
		// Parse mortgage terms (with sensible defaults)
		interestRate := 0.06 // Default 6% annual interest rate
		if rate, ok := propertyDetails["mortgageInterestRate"].(float64); ok && rate > 0 && rate < 1.0 {
			interestRate = rate
		}

		termYears := 30 // Default 30-year mortgage
		if term, ok := propertyDetails["mortgageTermYears"].(float64); ok && term > 0 && term <= 50 {
			termYears = int(term)
		}

		// Parse optional PITI components
		propertyTaxAnnual := 0.0
		if tax, ok := propertyDetails["propertyTaxAnnual"].(float64); ok && tax >= 0 {
			propertyTaxAnnual = tax
		} else {
			// Estimate property tax as 1.2% of home value (national average)
			propertyTaxAnnual = purchasePrice * 0.012
		}

		homeInsuranceAnnual := 0.0
		if ins, ok := propertyDetails["homeInsuranceAnnual"].(float64); ok && ins >= 0 {
			homeInsuranceAnnual = ins
		} else {
			// Estimate home insurance as 0.5% of home value
			homeInsuranceAnnual = purchasePrice * 0.005
		}

		// Calculate monthly payment using amortization
		monthlyPayment := CalculateMonthlyPayment(mortgageAmount, interestRate, termYears*12)

		// Create mortgage liability with PITI components - FIXED: Now includes full PITI data
		mortgageLiability := &LiabilityInfo{
			ID:                         fmt.Sprintf("mortgage-%s", event.ID),
			Name:                       fmt.Sprintf("Mortgage for Property %s", event.ID),
			Type:                       "MORTGAGE",
			CurrentPrincipalBalance:    mortgageAmount,
			InterestRate:               interestRate,
			TermRemainingMonths:        termYears * 12,
			MonthlyPayment:             monthlyPayment,
			IsTaxDeductible:            true, // Mortgage interest is typically tax deductible
			// PITI Components - Enhanced mortgage modeling (no longer thrown away!)
			PropertyTaxAnnual:          propertyTaxAnnual,
			HomeownersInsuranceAnnual:  homeInsuranceAnnual,
			PMIAnnual:                  0, // PMI calculated based on down payment in full implementation
			PropertyTaxDeductible:      true, // Property tax is typically deductible
			MortgageInterestDeductible: true, // Mortgage interest is typically deductible
		}

		// Add to engine's liability list
		if se.liabilities == nil {
			se.liabilities = make([]*LiabilityInfo, 0)
		}
		se.liabilities = append(se.liabilities, mortgageLiability)

		simLogVerbose("🏠 [REAL_ESTATE] Created mortgage: $%.2f at %.2f%% for %d years, monthly payment: $%.2f",
			mortgageAmount, interestRate*100, termYears, monthlyPayment)
	}

	simLogVerbose("🏠 [REAL_ESTATE] Purchased property for $%.2f (down payment: $%.2f, mortgage: $%.2f)",
		purchasePrice, downPaymentAmount, mortgageAmount)

	return nil
}

// RealEstateSaleEventHandler handles real estate sale events
type RealEstateSaleEventHandler struct{}

func (h *RealEstateSaleEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Add sale proceeds to cash
	accounts.Cash += event.Amount
	*cashFlow += event.Amount

	// Track as positive cash flow (property sale income)
	se.currentMonthFlows.IncomeThisMonth += event.Amount
	se.currentMonthFlows.OneTimeEventsImpactThisMonth += event.Amount

	return nil
}

// DefaultEventHandler handles unknown event types
type DefaultEventHandler struct{}

func (h *DefaultEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// For unhandled event types, silently ignore (debug removed for performance)
	return nil
}

// StrategyPolicyEventHandler handles STRATEGY_POLICY events
// These are meta-events for timeline visualization - they don't affect account balances
type StrategyPolicyEventHandler struct{}

func (h *StrategyPolicyEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Strategy policy events are for visualization only - no financial impact
	simLogEvent("📊 Strategy policy event: %s (visualization only)", event.Description)
	return nil
}

// StrategyExecutionEventHandler handles STRATEGY_EXECUTION events
// These are individual strategy actions that may trigger other events
type StrategyExecutionEventHandler struct{}

func (h *StrategyExecutionEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// Strategy execution events are logged but don't directly affect balances
	// The actual financial impact comes from the events they generate
	simLogEvent("📊 Strategy execution: %s", event.Description)
	return nil
}
