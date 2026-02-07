package main

import "errors"

// PERF: Package-level singleton to avoid per-miss allocation in GetHandler
var defaultHandler EventHandler = &DefaultEventHandler{}

// PERF: Sentinel error avoids fmt.Errorf allocation per GetHandler miss
var errNoHandler = errors.New("no handler found for event type")

// EventHandlerRegistry manages the mapping of event types to their handlers
type EventHandlerRegistry struct {
	handlers    map[EventType]EventHandler
	debugLogged map[EventType]bool // Track what we've already logged to prevent spam
}

// NewEventHandlerRegistry creates and initializes a new event handler registry
func NewEventHandlerRegistry() *EventHandlerRegistry {
	registry := &EventHandlerRegistry{
		handlers: make(map[EventType]EventHandler),
	}

	// Register all event handlers
	registry.registerHandlers()

	return registry
}

// registerHandlers registers all event type handlers
func (r *EventHandlerRegistry) registerHandlers() {
	// Income and expense events
	r.handlers[EventTypeIncome] = &IncomeEventHandler{}
	r.handlers[EventTypeExpense] = &RecurringExpenseEventHandler{} // Map basic EXPENSE to handler
	r.handlers[EventTypeRecurringExpense] = &RecurringExpenseEventHandler{}
	r.handlers[EventTypeOneTimeExpense] = &OneTimeExpenseEventHandler{}

	// Investment and contribution events
	r.handlers[EventTypeContribution] = NewScheduledContributionEventHandler() // Map basic CONTRIBUTION to handler

	r.handlers[EventTypeScheduledContribution] = NewScheduledContributionEventHandler()
	r.handlers[EventTypeRothConversion] = &RothConversionEventHandler{}

	// Income stream events
	r.handlers[EventTypeSocialSecurityIncome] = &SocialSecurityIncomeEventHandler{}
	r.handlers[EventTypePensionIncome] = &PensionIncomeEventHandler{}
	r.handlers[EventTypeDividendIncome] = &DividendIncomeEventHandler{}
	r.handlers[EventTypeAnnuityPayment] = &AnnuityPaymentEventHandler{}

	// Capital gains and investment events
	r.handlers[EventTypeCapitalGainsRealization] = &CapitalGainsRealizationEventHandler{}
	// RSU handlers removed - overly complex feature not needed

	// Portfolio management events
	r.handlers[EventTypeRebalancePortfolio] = &RebalancePortfolioEventHandler{}
	r.handlers[EventTypeTaxLossHarvestingSale] = &TaxLossHarvestingSaleEventHandler{}
	r.handlers[EventTypeStrategicCapitalGainsRealization] = &StrategicCapitalGainsRealizationEventHandler{}
	r.handlers[EventTypeTaxLossHarvestingCheckAndExecute] = &TaxLossHarvestingCheckAndExecuteEventHandler{}

	// Healthcare and charitable events
	r.handlers[EventTypeHealthcareCost] = &HealthcareCostEventHandler{}
	r.handlers[EventTypeQualifiedCharitableDistribution] = &QualifiedCharitableDistributionEventHandler{}

	// Cash management events
	r.handlers[EventTypeAdjustCashReserveSellAssets] = &AdjustCashReserveSellAssetsEventHandler{}
	r.handlers[EventTypeAdjustCashReserveBuyAssets] = &AdjustCashReserveBuyAssetsEventHandler{}

	// Planning and monitoring events
	r.handlers[EventTypeGoalDefine] = &GoalDefineEventHandler{}
	r.handlers[EventTypeConcentrationRiskAlert] = &ConcentrationRiskAlertEventHandler{}

	// Distribution events
	r.handlers[EventTypeRequiredMinimumDistribution] = &RequiredMinimumDistributionEventHandler{}

	// Withdrawal and transfer events
	r.handlers[EventTypeWithdrawal] = &WithdrawalEventHandler{}
	r.handlers[EventTypeTransfer] = &TransferEventHandler{}

	// Debt and liability events
	r.handlers[EventTypeOneTimeEvent] = &OneTimeEventEventHandler{}
	r.handlers[EventTypeLiabilityAdd] = &LiabilityAddEventHandler{}
	r.handlers[EventTypeMortgageOrigination] = &LiabilityAddEventHandler{} // Use same handler
	r.handlers[EventTypeLiabilityPayment] = &LiabilityPaymentEventHandler{}
	r.handlers[EventTypeDebtPayment] = &DebtPaymentEventHandler{}
	r.handlers[EventTypeRateReset] = &RateResetEventHandler{}

	// Real estate events
	r.handlers[EventTypeRealEstatePurchase] = &RealEstatePurchaseEventHandler{}
	r.handlers[EventTypeRealEstateSale] = &RealEstateSaleEventHandler{}

	// Strategy configuration events
	r.handlers[EventTypeStrategyAssetAllocationSet] = &StrategyAssetAllocationSetEventHandler{}
	r.handlers[EventTypeStrategyRebalancingRuleSet] = &StrategyRebalancingRuleSetEventHandler{}

	// Initial state events
	r.handlers[EventTypeInitialState] = &InitialStateEventHandler{}

	// Insurance events
	r.handlers[EventTypeLifeInsurancePremium] = &LifeInsurancePremiumEventHandler{}
	r.handlers[EventTypeLifeInsurancePayout] = &LifeInsurancePayoutEventHandler{}
	r.handlers[EventTypeDisabilityInsurancePremium] = &DisabilityInsurancePremiumEventHandler{}
	r.handlers[EventTypeDisabilityInsurancePayout] = &DisabilityInsurancePayoutEventHandler{}
	r.handlers[EventTypeLongTermCareInsurancePremium] = &LongTermCareInsurancePremiumEventHandler{}
	r.handlers[EventTypeLongTermCarePayout] = &LongTermCarePayoutEventHandler{}

	// Education events
	r.handlers[EventTypeFiveTwoNineContribution] = &FiveTwoNineContributionEventHandler{}
	r.handlers[EventTypeFiveTwoNineWithdrawal] = &FiveTwoNineWithdrawalEventHandler{}
	r.handlers[EventTypeTuitionPayment] = &TuitionPaymentEventHandler{}

	// HSA events
	r.handlers[EventTypeHSAContribution] = &HSAContributionEventHandler{}
	r.handlers[EventTypeHSAWithdrawal] = &HSAWithdrawalEventHandler{}

	// Business events
	r.handlers[EventTypeBusinessIncome] = &BusinessIncomeEventHandler{}
	r.handlers[EventTypeQuarterlyEstimatedTaxPayment] = &QuarterlyEstimatedTaxPaymentEventHandler{}
	r.handlers[EventTypeTaxPayment] = &TaxPaymentEventHandler{}

	// New expense handlers
	r.handlers[EventTypeHealthInsurancePremium] = &HealthInsurancePremiumEventHandler{}
	r.handlers[EventTypePropertyInsurance] = &PropertyInsuranceEventHandler{}
	r.handlers[EventTypeCarPurchase] = &CarPurchaseEventHandler{}
	r.handlers[EventTypeHomeRenovation] = &HomeRenovationEventHandler{}
	r.handlers[EventTypeEmergencyExpense] = &EmergencyExpenseEventHandler{}
	r.handlers[EventTypeVacationExpense] = &VacationExpenseEventHandler{}

	// Strategy Policy Events - Meta-events for timeline visualization (no-op handlers)
	r.handlers[EventTypeStrategyPolicy] = &StrategyPolicyEventHandler{}
	r.handlers[EventTypeStrategyExecution] = &StrategyExecutionEventHandler{}

	// =============================================================================
	// PFOS-E UNIFIED HANDLERS - Consolidated event types
	// =============================================================================

	// Unified Income Handler - consolidates all income event types
	r.handlers[EventTypeCashflowIncome] = &UnifiedIncomeEventHandler{}

	// Unified Expense Handler - consolidates all expense event types
	r.handlers[EventTypeCashflowExpense] = &UnifiedExpenseEventHandler{}

	// Unified Insurance Premium Handler - consolidates all insurance premium types
	r.handlers[EventTypeInsurancePremium] = &UnifiedInsurancePremiumEventHandler{}

	// Unified Insurance Payout Handler - consolidates all insurance payout types
	r.handlers[EventTypeInsurancePayout] = &UnifiedInsurancePayoutEventHandler{}

	// Unified Contribution Handler - enhanced with PFOS-E metadata
	r.handlers[EventTypeAccountContribution] = NewUnifiedContributionEventHandler()

	// Exposure Change Handler - for RSU/concentration wedge
	r.handlers[EventTypeExposureChange] = &ExposureChangeEventHandler{}
}

// GetHandler returns the handler for a given event type
func (r *EventHandlerRegistry) GetHandler(eventType EventType) (EventHandler, error) {
	if handler, exists := r.handlers[eventType]; exists {
		return handler, nil
	}

	// PERF: Only do debug tracking when VERBOSE_DEBUG is enabled (const-eliminated otherwise)
	if VERBOSE_DEBUG {
		if r.debugLogged == nil {
			r.debugLogged = make(map[EventType]bool)
		}
		if !r.debugLogged[eventType+"_error"] {
			simLogVerbose("DEBUG No handler found for event type: %s", eventType)
			r.debugLogged[eventType+"_error"] = true
		}
	}

	// Return default handler for unknown event types
	return defaultHandler, errNoHandler
}

// ProcessEvent processes an event using the appropriate handler
func (r *EventHandlerRegistry) ProcessEvent(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	// CRITICAL DEBUG: Log income events when verbose debugging is enabled
	if VERBOSE_DEBUG && (event.Type == "INCOME" || context.CurrentMonth == 0) {
		simLogVerbose("🚨 [REGISTRY-CRITICAL] ProcessEvent: id=%s type='%s' amount=%.2f Month=%d",
			event.ID, event.Type, event.Amount, context.CurrentMonth)
		simLogVerbose("🚨 [REGISTRY-CRITICAL] GetHandler lookup for EventType='%s'", event.Type)
	}
	handler, err := r.GetHandler(EventType(event.Type))
	if err != nil {
		// CRITICAL: Log handler failures when verbose debugging is enabled
		if VERBOSE_DEBUG && (event.Type == "INCOME" || context.CurrentMonth == 0) {
			simLogVerbose("🚨 [REGISTRY-CRITICAL] HANDLER LOOKUP FAILED: %v - using DefaultEventHandler", err)
		}
	} else if VERBOSE_DEBUG && (event.Type == "INCOME" || context.CurrentMonth == 0) {
		simLogVerbose("🚨 [REGISTRY-CRITICAL] Handler found: %T for type='%s'", handler, event.Type)
	}

	cashBefore := *cashFlow
	accountsCashBefore := accounts.Cash

	err = handler.Process(event, accounts, cashFlow, context)

	// Only log first month and significant changes when verbose debugging is enabled
	if VERBOSE_DEBUG && (context.CurrentMonth == 0 || (accountsCashBefore != accounts.Cash && context.CurrentMonth < 12)) {
		// Safer logging for Month 11+ to avoid ValueOf panic with event.ID
		if context.CurrentMonth >= 11 {
			simLogVerbose("DEBUG Event processed: [Month %d] cashFlow %.2f->%.2f accounts.Cash %.2f->%.2f",
				context.CurrentMonth, cashBefore, *cashFlow, accountsCashBefore, accounts.Cash)
		} else {
			simLogVerbose("DEBUG Event processed: id=%s cashFlow %.2f->%.2f accounts.Cash %.2f->%.2f",
				event.ID, cashBefore, *cashFlow, accountsCashBefore, accounts.Cash)
		}
	}

	return err
}

// RegisterHandler allows registering custom handlers for event types
func (r *EventHandlerRegistry) RegisterHandler(eventType EventType, handler EventHandler) {
	r.handlers[eventType] = handler
}

// GetRegisteredEventTypes returns all currently registered event types
func (r *EventHandlerRegistry) GetRegisteredEventTypes() []EventType {
	eventTypes := make([]EventType, 0, len(r.handlers))
	for eventType := range r.handlers {
		eventTypes = append(eventTypes, eventType)
	}
	return eventTypes
}
