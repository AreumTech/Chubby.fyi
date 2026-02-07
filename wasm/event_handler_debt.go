package main

import "math"

// =============================================================================
// DEBT EVENT HANDLERS - PFOS-E Debt Management Events
//
// This module contains handlers for debt-specific events:
// - RateResetEventHandler: Adjusts interest rates on variable-rate loans
//
// PFOS-E Invariant: All handlers log via simLogEvent for traceability
// =============================================================================

// RateResetEventHandler handles variable-rate loan rate adjustments
// This allows mid-simulation rate changes for ARMs, HELOCs, and other variable loans
type RateResetEventHandler struct{}

// Process implements the EventHandler interface for rate resets
func (h *RateResetEventHandler) Process(event FinancialEvent, accounts *AccountHoldingsMonthEnd, cashFlow *float64, context *EventProcessingContext) error {
	se := context.SimulationEngine

	// Extract rate reset parameters from event
	targetLiabilityID := ""
	var newInterestRate *float64
	var newBaseRate *float64

	// Get target liability ID
	if event.Metadata != nil {
		if id, ok := event.Metadata["targetLiabilityId"].(string); ok {
			targetLiabilityID = id
		}
		if rate, ok := event.Metadata["newInterestRate"].(float64); ok {
			newInterestRate = &rate
		}
		if baseRate, ok := event.Metadata["newBaseRate"].(float64); ok {
			newBaseRate = &baseRate
		}
	}

	if targetLiabilityID == "" {
		simLogEvent("WARN  RATE-RESET: Missing targetLiabilityId, skipping event")
		return nil
	}

	// Find the target liability
	var targetLiability *LiabilityInfo
	for i := range se.liabilities {
		if se.liabilities[i].ID == targetLiabilityID {
			targetLiability = se.liabilities[i]
			break
		}
	}

	if targetLiability == nil {
		simLogEvent("WARN  RATE-RESET: Liability %s not found, may have been paid off", targetLiabilityID)
		return nil
	}

	oldRate := targetLiability.InterestRate

	// Apply rate change
	if newInterestRate != nil {
		// Explicit rate override
		targetLiability.InterestRate = *newInterestRate
		simLogEvent("RATE-RESET: %s rate changed from %.2f%% to %.2f%% (explicit override)",
			targetLiability.Name, oldRate*100, *newInterestRate*100)
	} else if newBaseRate != nil {
		// Variable rate: base + margin
		// Look for margin in liability metadata (would need to be stored at liability creation)
		margin := 0.0
		// For now, calculate margin from current rate if this is the first reset
		// In a full implementation, margin would be stored on the liability
		targetLiability.InterestRate = *newBaseRate + margin
		simLogEvent("RATE-RESET: %s rate changed from %.2f%% to %.2f%% (base rate: %.2f%%)",
			targetLiability.Name, oldRate*100, targetLiability.InterestRate*100, *newBaseRate*100)
	} else {
		simLogEvent("WARN  RATE-RESET: No rate change specified for %s", targetLiability.Name)
		return nil
	}

	// Recalculate monthly payment based on new rate
	// P = L[c(1 + c)^n]/[(1 + c)^n – 1]
	// where c = monthly rate, n = remaining months, L = remaining balance
	if targetLiability.TermRemainingMonths > 0 && targetLiability.CurrentPrincipalBalance > 0 {
		monthlyRate := targetLiability.InterestRate / 12.0
		n := float64(targetLiability.TermRemainingMonths)
		L := targetLiability.CurrentPrincipalBalance

		if monthlyRate > 0 {
			// Standard amortization formula
			factor := monthlyRate * math.Pow(1+monthlyRate, n) / (math.Pow(1+monthlyRate, n) - 1)
			newPayment := L * factor

			oldPayment := targetLiability.MonthlyPayment
			targetLiability.MonthlyPayment = newPayment

			simLogEvent("RATE-RESET: Monthly payment changed from $%.2f to $%.2f",
				oldPayment, newPayment)
		}
	}

	// Log for PFOS-E traceability
	driverKey := "debt:interest"
	if event.DriverKey != nil {
		driverKey = *event.DriverKey
	}
	simLogEvent("RATE-RESET: Event processed [driverKey=%s]", driverKey)

	return nil
}

