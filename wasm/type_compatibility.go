package main

// Type compatibility layer to bridge generated types with legacy types
// This allows the codebase to gradually migrate to generated types

// Type aliases for compatibility
type EventType = SimulatorEventType

// Import types from generated_interface_types.go by re-using the imported names
// Note: FilingStatus and StandardAccountType are already defined in generated_interface_types.go

// Re-export commonly used constants with legacy names
// These map generated constants to legacy constant names for backward compatibility
const (
	// Legacy event type constants that map to generated types
	EventTypeScheduledContribution EventType = "SCHEDULED_CONTRIBUTION"
	EventTypeRecurringExpense      EventType = "RECURRING_EXPENSE"
	EventTypeOneTimeExpense        EventType = "ONE_TIME_EXPENSE"
	EventTypeOneTimeEvent          EventType = "ONE_TIME_EVENT"

	// Filing status constants for compatibility
	FilingStatusMarriedFilingJointly    = FilingStatusMarriedJointly
	FilingStatusMarriedFilingSeparately = FilingStatusMarriedSeparately

	// Additional legacy constants that aren't in generated types yet
	// These will need to be added to the schema eventually
	// NOTE: Only define constants that don't already exist in generated files
	EventTypeLiabilityAdd                     EventType = "LIABILITY_ADD"
	EventTypeLiabilityPayment                 EventType = "LIABILITY_PAYMENT"
	EventTypeDebtPayment                      EventType = "DEBT_PAYMENT"
	EventTypeRateReset                        EventType = "RATE_RESET"
	EventTypeRealEstatePurchase               EventType = "REAL_ESTATE_PURCHASE"
	EventTypeRealEstateSale                   EventType = "REAL_ESTATE_SALE"
	EventTypeSocialSecurityIncome             EventType = "SOCIAL_SECURITY_INCOME"
	EventTypeHealthcareCost                   EventType = "HEALTHCARE_COST"
	EventTypeStrategyAssetAllocationSet       EventType = "STRATEGY_ASSET_ALLOCATION_SET"
	EventTypeStrategyRebalancingRuleSet       EventType = "STRATEGY_REBALANCING_RULE_SET"
	EventTypeRebalancePortfolio               EventType = "REBALANCE_PORTFOLIO"
	EventTypeTaxLossHarvestingSale            EventType = "TAX_LOSS_HARVESTING_SALE"
	EventTypeInitialState                     EventType = "INITIAL_STATE"
	EventTypeStrategicCapitalGainsRealization EventType = "STRATEGIC_CAPITAL_GAINS_REALIZATION"
	EventTypeQualifiedCharitableDistribution  EventType = "QUALIFIED_CHARITABLE_DISTRIBUTION"
	EventTypeAdjustCashReserveSellAssets      EventType = "ADJUST_CASH_RESERVE_SELL_ASSETS"
	EventTypeAdjustCashReserveBuyAssets       EventType = "ADJUST_CASH_RESERVE_BUY_ASSETS"
	EventTypeGoalDefine                       EventType = "GOAL_DEFINE"
	// RSU types removed - overly complex feature not needed
	EventTypeTaxLossHarvestingCheckAndExecute EventType = "TAX_LOSS_HARVESTING_CHECK_AND_EXECUTE"
	EventTypeConcentrationRiskAlert           EventType = "CONCENTRATION_RISK_ALERT"
	EventTypePensionIncome                    EventType = "PENSION_INCOME"
	EventTypeAnnuityPayment                   EventType = "ANNUITY_PAYMENT"
	EventTypeRequiredMinimumDistribution      EventType = "REQUIRED_MINIMUM_DISTRIBUTION"
	EventTypeDividendIncome                   EventType = "DIVIDEND_INCOME"
	EventTypeCapitalGainsRealization          EventType = "CAPITAL_GAINS_REALIZATION"
	EventTypeMortgageOrigination              EventType = "MORTGAGE_ORIGINATION"
	EventTypeLifeInsurancePremium             EventType = "LIFE_INSURANCE_PREMIUM"
	EventTypeLifeInsurancePayout              EventType = "LIFE_INSURANCE_PAYOUT"
	EventTypeDisabilityInsurancePremium       EventType = "DISABILITY_INSURANCE_PREMIUM"
	EventTypeDisabilityInsurancePayout        EventType = "DISABILITY_INSURANCE_PAYOUT"
	EventTypeLongTermCareInsurancePremium     EventType = "LONG_TERM_CARE_INSURANCE_PREMIUM"
	EventTypeLongTermCarePayout               EventType = "LONG_TERM_CARE_PAYOUT"
	EventTypeFiveTwoNineContribution          EventType = "FIVE_TWO_NINE_CONTRIBUTION"
	EventTypeFiveTwoNineWithdrawal            EventType = "FIVE_TWO_NINE_WITHDRAWAL"
	EventTypeHSAContribution                  EventType = "HSA_CONTRIBUTION"
	EventTypeHSAWithdrawal                    EventType = "HSA_WITHDRAWAL"
	EventTypeTuitionPayment                   EventType = "TUITION_PAYMENT"
	EventTypeBusinessIncome                   EventType = "BUSINESS_INCOME"
	EventTypeQuarterlyEstimatedTaxPayment     EventType = "QUARTERLY_ESTIMATED_TAX_PAYMENT"
	EventTypeHealthInsurancePremium           EventType = "HEALTH_INSURANCE_PREMIUM"
	EventTypePropertyInsurance                EventType = "PROPERTY_INSURANCE"
	EventTypeCarPurchase                      EventType = "CAR_PURCHASE"
	EventTypeHomeRenovation                   EventType = "HOME_RENOVATION"
	EventTypeEmergencyExpense                 EventType = "EMERGENCY_EXPENSE"
	EventTypeVacationExpense                  EventType = "VACATION_EXPENSE"

	// Strategy Policy Events - Duration-based strategies for timeline visualization
	EventTypeStrategyPolicy                   EventType = "STRATEGY_POLICY"
	EventTypeStrategyExecution                EventType = "STRATEGY_EXECUTION"
)
