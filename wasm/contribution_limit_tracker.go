package main

import (
	"fmt"
	"time"
)

/**
 * Contribution Limit Tracker
 *
 * Enforces IRS contribution limits for retirement accounts to ensure plan compliance.
 * Updated annually based on IRS announcements and inflation adjustments.
 *
 * Key Limits (2024):
 * - 401(k)/403(b)/457: $23,000 + $7,500 catch-up (age 50+)
 * - Traditional/Roth IRA: $7,000 + $1,000 catch-up (age 50+)
 * - HSA: $4,150 (individual) / $8,300 (family) + $1,000 catch-up (age 55+)
 * - SEP IRA: Lesser of 25% compensation or $69,000
 * - Simple IRA: $16,000 + $3,500 catch-up (age 50+)
 *
 * References:
 * - IRS Publication 590-A (IRA Contributions)
 * - IRS Publication 560 (SEP, SIMPLE, and Qualified Plans)
 * - IRS Notice 2023-75 (2024 limits)
 */

// ContributionLimits holds IRS contribution limits for a given tax year
type ContributionLimits struct {
	Year int

	// 401(k), 403(b), 457 limits
	DeferredContributionLimit    float64 // $23,000 (2024)
	DeferredCatchUpLimit         float64 // $7,500 (2024)
	DeferredCatchUpAge           int     // 50

	// IRA limits (Traditional and Roth combined)
	IRAContributionLimit         float64 // $7,000 (2024)
	IRACatchUpLimit              float64 // $1,000 (2024)
	IRACatchUpAge                int     // 50

	// HSA limits
	HSAIndividualLimit           float64 // $4,150 (2024)
	HSAFamilyLimit               float64 // $8,300 (2024)
	HSACatchUpLimit              float64 // $1,000 (2024)
	HSACatchUpAge                int     // 55

	// SIMPLE IRA limits
	SIMPLEContributionLimit      float64 // $16,000 (2024)
	SIMPLECatchUpLimit           float64 // $3,500 (2024)
	SIMPLECatchUpAge             int     // 50

	// SEP IRA limits
	SEPContributionLimit         float64 // $69,000 (2024)
	SEPCompensationPercentage    float64 // 25%

	// Overall defined contribution plan limit
	OverallDCPlanLimit           float64 // $69,000 (2024, includes employer + employee)
}

// ContributionLimitTracker tracks year-to-date contributions and enforces IRS limits
type ContributionLimitTracker struct {
	limits                ContributionLimits

	// Track YTD contributions by account type
	ytdTaxDeferred        float64 // 401k, 403b, 457 combined
	ytdIRA                float64 // Traditional + Roth IRA combined
	ytdHSA                float64 // HSA contributions
	ytdSIMPLE             float64 // SIMPLE IRA contributions
	ytdSEP                float64 // SEP IRA contributions

	// Track which year these totals are for (reset on Jan 1)
	trackingYear          int

	// User demographics for catch-up eligibility
	userAge               int
	hasFamily             bool // For HSA family vs individual limit
}

// NewContributionLimitTracker creates a new tracker with 2024 IRS limits
func NewContributionLimitTracker() *ContributionLimitTracker {
	return &ContributionLimitTracker{
		limits: GetContributionLimits(2024),
		trackingYear: time.Now().Year(),
		ytdTaxDeferred: 0,
		ytdIRA: 0,
		ytdHSA: 0,
		ytdSIMPLE: 0,
		ytdSEP: 0,
		userAge: 35, // Will be updated from simulation input
		hasFamily: false,
	}
}

// GetContributionLimits returns IRS contribution limits for a given year
func GetContributionLimits(year int) ContributionLimits {
	// 2024 limits (most current)
	if year >= 2024 {
		return ContributionLimits{
			Year: year,
			DeferredContributionLimit: 23000,
			DeferredCatchUpLimit: 7500,
			DeferredCatchUpAge: 50,
			IRAContributionLimit: 7000,
			IRACatchUpLimit: 1000,
			IRACatchUpAge: 50,
			HSAIndividualLimit: 4150,
			HSAFamilyLimit: 8300,
			HSACatchUpLimit: 1000,
			HSACatchUpAge: 55,
			SIMPLEContributionLimit: 16000,
			SIMPLECatchUpLimit: 3500,
			SIMPLECatchUpAge: 50,
			SEPContributionLimit: 69000,
			SEPCompensationPercentage: 0.25,
			OverallDCPlanLimit: 69000,
		}
	}

	// 2023 limits
	if year == 2023 {
		return ContributionLimits{
			Year: year,
			DeferredContributionLimit: 22500,
			DeferredCatchUpLimit: 7500,
			DeferredCatchUpAge: 50,
			IRAContributionLimit: 6500,
			IRACatchUpLimit: 1000,
			IRACatchUpAge: 50,
			HSAIndividualLimit: 3850,
			HSAFamilyLimit: 7750,
			HSACatchUpLimit: 1000,
			HSACatchUpAge: 55,
			SIMPLEContributionLimit: 15500,
			SIMPLECatchUpLimit: 3500,
			SIMPLECatchUpAge: 50,
			SEPContributionLimit: 66000,
			SEPCompensationPercentage: 0.25,
			OverallDCPlanLimit: 66000,
		}
	}

	// Default to 2024 for future years (will need annual updates)
	return GetContributionLimits(2024)
}

// SetUserAge updates the user's age for catch-up eligibility calculations
func (tracker *ContributionLimitTracker) SetUserAge(age int) {
	tracker.userAge = age
}

// SetHasFamily sets whether the user has family coverage (for HSA limits)
func (tracker *ContributionLimitTracker) SetHasFamily(hasFamily bool) {
	tracker.hasFamily = hasFamily
}

// ResetForNewYear resets YTD tracking on January 1
func (tracker *ContributionLimitTracker) ResetForNewYear(newYear int) {
	if newYear != tracker.trackingYear {
		tracker.trackingYear = newYear
		tracker.ytdTaxDeferred = 0
		tracker.ytdIRA = 0
		tracker.ytdHSA = 0
		tracker.ytdSIMPLE = 0
		tracker.ytdSEP = 0

		// Update limits for new year if available
		tracker.limits = GetContributionLimits(newYear)
	}
}

// GetMaxAllowedContribution returns the maximum contribution allowed for an account type
// Takes into account YTD contributions and catch-up eligibility
func (tracker *ContributionLimitTracker) GetMaxAllowedContribution(accountType string, requestedAmount float64) float64 {
	var limit float64
	var ytd float64

	switch accountType {
	case "tax_deferred", "401k", "403b", "457":
		limit = tracker.limits.DeferredContributionLimit
		if tracker.userAge >= tracker.limits.DeferredCatchUpAge {
			limit += tracker.limits.DeferredCatchUpLimit
		}
		ytd = tracker.ytdTaxDeferred

	case "ira", "roth", "rothIra", "traditionalIra":
		limit = tracker.limits.IRAContributionLimit
		if tracker.userAge >= tracker.limits.IRACatchUpAge {
			limit += tracker.limits.IRACatchUpLimit
		}
		ytd = tracker.ytdIRA

	case "hsa":
		if tracker.hasFamily {
			limit = tracker.limits.HSAFamilyLimit
		} else {
			limit = tracker.limits.HSAIndividualLimit
		}
		if tracker.userAge >= tracker.limits.HSACatchUpAge {
			limit += tracker.limits.HSACatchUpLimit
		}
		ytd = tracker.ytdHSA

	case "simple", "simpleIra":
		limit = tracker.limits.SIMPLEContributionLimit
		if tracker.userAge >= tracker.limits.SIMPLECatchUpAge {
			limit += tracker.limits.SIMPLECatchUpLimit
		}
		ytd = tracker.ytdSIMPLE

	case "sep", "sepIra":
		limit = tracker.limits.SEPContributionLimit
		ytd = tracker.ytdSEP

	default:
		// No limit for taxable accounts
		return requestedAmount
	}

	// Calculate remaining room
	remainingRoom := limit - ytd
	if remainingRoom <= 0 {
		return 0
	}

	// Return lesser of requested amount or remaining room
	if requestedAmount <= remainingRoom {
		return requestedAmount
	}
	return remainingRoom
}

// TrackContribution records a contribution and updates YTD tracking
func (tracker *ContributionLimitTracker) TrackContribution(accountType string, amount float64) error {
	if amount < 0 {
		return fmt.Errorf("contribution amount cannot be negative: %.2f", amount)
	}

	switch accountType {
	case "tax_deferred", "401k", "403b", "457":
		tracker.ytdTaxDeferred += amount
	case "ira", "roth", "rothIra", "traditionalIra":
		tracker.ytdIRA += amount
	case "hsa":
		tracker.ytdHSA += amount
	case "simple", "simpleIra":
		tracker.ytdSIMPLE += amount
	case "sep", "sepIra":
		tracker.ytdSEP += amount
	default:
		// Taxable accounts have no limits, nothing to track
		return nil
	}

	return nil
}

// GetYTDContribution returns year-to-date contributions for an account type
func (tracker *ContributionLimitTracker) GetYTDContribution(accountType string) float64 {
	switch accountType {
	case "tax_deferred", "401k", "403b", "457":
		return tracker.ytdTaxDeferred
	case "ira", "roth", "rothIra", "traditionalIra":
		return tracker.ytdIRA
	case "hsa":
		return tracker.ytdHSA
	case "simple", "simpleIra":
		return tracker.ytdSIMPLE
	case "sep", "sepIra":
		return tracker.ytdSEP
	default:
		return 0
	}
}

// GetLimit returns the annual contribution limit for an account type (including catch-up if eligible)
func (tracker *ContributionLimitTracker) GetLimit(accountType string) float64 {
	switch accountType {
	case "tax_deferred", "401k", "403b", "457":
		limit := tracker.limits.DeferredContributionLimit
		if tracker.userAge >= tracker.limits.DeferredCatchUpAge {
			limit += tracker.limits.DeferredCatchUpLimit
		}
		return limit

	case "ira", "roth", "rothIra", "traditionalIra":
		limit := tracker.limits.IRAContributionLimit
		if tracker.userAge >= tracker.limits.IRACatchUpAge {
			limit += tracker.limits.IRACatchUpLimit
		}
		return limit

	case "hsa":
		limit := tracker.limits.HSAIndividualLimit
		if tracker.hasFamily {
			limit = tracker.limits.HSAFamilyLimit
		}
		if tracker.userAge >= tracker.limits.HSACatchUpAge {
			limit += tracker.limits.HSACatchUpLimit
		}
		return limit

	case "simple", "simpleIra":
		limit := tracker.limits.SIMPLEContributionLimit
		if tracker.userAge >= tracker.limits.SIMPLECatchUpAge {
			limit += tracker.limits.SIMPLECatchUpLimit
		}
		return limit

	case "sep", "sepIra":
		return tracker.limits.SEPContributionLimit

	default:
		return 0 // No limit for taxable accounts
	}
}

// IsAtLimit returns true if the user has reached their contribution limit for an account type
func (tracker *ContributionLimitTracker) IsAtLimit(accountType string) bool {
	ytd := tracker.GetYTDContribution(accountType)
	limit := tracker.GetLimit(accountType)
	return ytd >= limit
}

// GetRemainingRoom returns how much contribution room is left for an account type
func (tracker *ContributionLimitTracker) GetRemainingRoom(accountType string) float64 {
	limit := tracker.GetLimit(accountType)
	ytd := tracker.GetYTDContribution(accountType)
	remaining := limit - ytd
	if remaining < 0 {
		return 0
	}
	return remaining
}

// IsCatchUpEligible returns true if the user is eligible for catch-up contributions
func (tracker *ContributionLimitTracker) IsCatchUpEligible(accountType string) bool {
	switch accountType {
	case "tax_deferred", "401k", "403b", "457":
		return tracker.userAge >= tracker.limits.DeferredCatchUpAge
	case "ira", "roth", "rothIra", "traditionalIra":
		return tracker.userAge >= tracker.limits.IRACatchUpAge
	case "hsa":
		return tracker.userAge >= tracker.limits.HSACatchUpAge
	case "simple", "simpleIra":
		return tracker.userAge >= tracker.limits.SIMPLECatchUpAge
	default:
		return false
	}
}
