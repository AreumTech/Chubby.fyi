package main

import (
	"fmt"
	"math"
)

// TaxPaymentSchedule manages the timing of different tax payments
type TaxPaymentSchedule struct {
	WithholdingSchedule []MonthlyWithholding `json:"withholdingSchedule"`
	EstimatedPayments   []EstimatedPayment   `json:"estimatedPayments"`
	FinalSettlement     *FinalTaxSettlement  `json:"finalSettlement"`
	TotalWithholdingYTD float64              `json:"totalWithholdingYTD"`
	TotalEstimatedYTD   float64              `json:"totalEstimatedYTD"`
}

// MonthlyWithholding represents tax withheld from income sources each month
type MonthlyWithholding struct {
	MonthOffset         int     `json:"monthOffset"`
	SalaryWithholding   float64 `json:"salaryWithholding"`
	DividendWithholding float64 `json:"dividendWithholding"`
	PensionWithholding  float64 `json:"pensionWithholding"`
	TotalWithholding    float64 `json:"totalWithholding"`
}

// EstimatedPayment represents quarterly estimated tax payments
type EstimatedPayment struct {
	Quarter       int     `json:"quarter"`     // 1-4
	MonthOffset   int     `json:"monthOffset"` // Month when payment is due
	PaymentAmount float64 `json:"paymentAmount"`
	PaymentType   string  `json:"paymentType"` // "business_income", "capital_gains", etc.
	IsPaid        bool    `json:"isPaid"`
}

// FinalTaxSettlement represents the final tax settlement in April
type FinalTaxSettlement struct {
	MonthOffset       int     `json:"monthOffset"` // April of following year
	TotalTaxLiability float64 `json:"totalTaxLiability"`
	TotalPaid         float64 `json:"totalPaid"`  // Withholding + estimated payments
	BalanceDue        float64 `json:"balanceDue"` // Positive if owe money
	RefundDue         float64 `json:"refundDue"`  // Positive if refund expected
	IsSettled         bool    `json:"isSettled"`
}

// TaxPaymentManager handles tax payment timing and calculations
type TaxPaymentManager struct {
	currentTaxYear int
	schedule       *TaxPaymentSchedule
}

// NewTaxPaymentManager creates a new tax payment manager
func NewTaxPaymentManager() *TaxPaymentManager {
	return &TaxPaymentManager{
		currentTaxYear: -1,
		schedule: &TaxPaymentSchedule{
			WithholdingSchedule: make([]MonthlyWithholding, 0),
			EstimatedPayments:   make([]EstimatedPayment, 0),
		},
	}
}

// ProcessMonthlyWithholding records withholding for the current month
func (tpm *TaxPaymentManager) ProcessMonthlyWithholding(monthOffset int, salaryWithholding, dividendWithholding, pensionWithholding float64) {
	totalWithholding := salaryWithholding + dividendWithholding + pensionWithholding

	withholding := MonthlyWithholding{
		MonthOffset:         monthOffset,
		SalaryWithholding:   salaryWithholding,
		DividendWithholding: dividendWithholding,
		PensionWithholding:  pensionWithholding,
		TotalWithholding:    totalWithholding,
	}

	tpm.schedule.WithholdingSchedule = append(tpm.schedule.WithholdingSchedule, withholding)
	tpm.schedule.TotalWithholdingYTD += totalWithholding
}

// ScheduleEstimatedPayment schedules a quarterly estimated tax payment
func (tpm *TaxPaymentManager) ScheduleEstimatedPayment(quarter int, estimatedIncome, taxRate float64, paymentType string) EstimatedPayment {
	// Quarterly due dates: Jan 15, Apr 15, Jun 15, Sep 15
	dueDates := map[int]int{
		1: 13, // January 15 (month 13 for previous tax year)
		2: 15, // April 15
		3: 17, // June 15
		4: 20, // September 15
	}

	paymentAmount := estimatedIncome * taxRate * 0.25 // Quarterly payment

	payment := EstimatedPayment{
		Quarter:       quarter,
		MonthOffset:   dueDates[quarter],
		PaymentAmount: paymentAmount,
		PaymentType:   paymentType,
		IsPaid:        false,
	}

	tpm.schedule.EstimatedPayments = append(tpm.schedule.EstimatedPayments, payment)
	return payment
}

// ProcessEstimatedPayment processes a quarterly estimated payment
func (tpm *TaxPaymentManager) ProcessEstimatedPayment(accounts *AccountHoldingsMonthEnd, monthOffset int) float64 {
	totalPaid := 0.0

	for i := range tpm.schedule.EstimatedPayments {
		payment := &tpm.schedule.EstimatedPayments[i]
		if payment.MonthOffset == monthOffset && !payment.IsPaid {
			// Make the payment if sufficient cash available
			if accounts.Cash >= payment.PaymentAmount {
				accounts.Cash -= payment.PaymentAmount
				payment.IsPaid = true
				totalPaid += payment.PaymentAmount
				tpm.schedule.TotalEstimatedYTD += payment.PaymentAmount
			}
		}
	}

	return totalPaid
}

// CalculateFinalTaxSettlement calculates the final tax settlement for April
func (tpm *TaxPaymentManager) CalculateFinalTaxSettlement(totalTaxLiability float64, taxYear int) *FinalTaxSettlement {
	// April of the following year (month 15 if tax year ends in month 11)
	aprilMonthOffset := (taxYear * 12) + 15 // Rough approximation

	totalPaid := tpm.schedule.TotalWithholdingYTD + tpm.schedule.TotalEstimatedYTD
	balance := totalTaxLiability - totalPaid

	settlement := &FinalTaxSettlement{
		MonthOffset:       aprilMonthOffset,
		TotalTaxLiability: totalTaxLiability,
		TotalPaid:         totalPaid,
		IsSettled:         false,
	}

	if balance > 0 {
		settlement.BalanceDue = balance
		settlement.RefundDue = 0
	} else {
		settlement.BalanceDue = 0
		settlement.RefundDue = math.Abs(balance)
	}

	tpm.schedule.FinalSettlement = settlement
	return settlement
}

// ProcessFinalTaxSettlement processes the final tax settlement in April
func (tpm *TaxPaymentManager) ProcessFinalTaxSettlement(accounts *AccountHoldingsMonthEnd, monthOffset int) float64 {
	if tpm.schedule.FinalSettlement == nil || tpm.schedule.FinalSettlement.IsSettled {
		return 0
	}

	settlement := tpm.schedule.FinalSettlement
	if settlement.MonthOffset != monthOffset {
		return 0
	}

	if settlement.BalanceDue > 0 {
		// Owe additional taxes
		if accounts.Cash >= settlement.BalanceDue {
			accounts.Cash -= settlement.BalanceDue
			settlement.IsSettled = true
			return settlement.BalanceDue
		} else {
			// Handle insufficient cash for tax payment - limit to reasonable amount
			// Never take more than 40% of available cash for taxes to prevent cash flow destruction
			maxReasonablePayment := accounts.Cash * 0.4
			actualPayment := math.Min(maxReasonablePayment, settlement.BalanceDue)

			// Also ensure we never take more than $50K in a single tax payment
			actualPayment = math.Min(actualPayment, 50000)

			if actualPayment > 0 {
				accounts.Cash -= actualPayment
				settlement.BalanceDue -= actualPayment
				return actualPayment
			}
			return 0 // Don't drain cash if calculation seems unreasonable
		}
	} else if settlement.RefundDue > 0 {
		// Receive refund
		accounts.Cash += settlement.RefundDue
		settlement.IsSettled = true
		return -settlement.RefundDue // Negative indicates refund received
	}

	return 0
}

// ResetForNewTaxYear resets the tax payment schedule for a new tax year
func (tpm *TaxPaymentManager) ResetForNewTaxYear(taxYear int) {
	// Preserve any pending settlement from the previous year (it will be settled in April)
	var pendingSettlement *FinalTaxSettlement
	if tpm.schedule != nil && tpm.schedule.FinalSettlement != nil && !tpm.schedule.FinalSettlement.IsSettled {
		pendingSettlement = tpm.schedule.FinalSettlement
	}

	tpm.currentTaxYear = taxYear
	tpm.schedule = &TaxPaymentSchedule{
		WithholdingSchedule: make([]MonthlyWithholding, 0),
		EstimatedPayments:   make([]EstimatedPayment, 0),
		FinalSettlement:     pendingSettlement, // Preserve unsettled settlement
		TotalWithholdingYTD: 0,
		TotalEstimatedYTD:   0,
	}
}

// GetTaxPaymentSummary returns a summary of tax payments for the year
func (tpm *TaxPaymentManager) GetTaxPaymentSummary() string {
	if tpm.schedule == nil {
		return "No tax payments scheduled"
	}

	totalWithholding := tpm.schedule.TotalWithholdingYTD
	totalEstimated := tpm.schedule.TotalEstimatedYTD
	totalPaid := totalWithholding + totalEstimated

	summary := fmt.Sprintf("Tax Payment Summary:\n")
	summary += fmt.Sprintf("  Withholding YTD: $%.2f\n", totalWithholding)
	summary += fmt.Sprintf("  Estimated Payments YTD: $%.2f\n", totalEstimated)
	summary += fmt.Sprintf("  Total Paid: $%.2f\n", totalPaid)

	if tpm.schedule.FinalSettlement != nil {
		settlement := tpm.schedule.FinalSettlement
		summary += fmt.Sprintf("  Final Settlement:\n")
		summary += fmt.Sprintf("    Total Liability: $%.2f\n", settlement.TotalTaxLiability)
		if settlement.BalanceDue > 0 {
			summary += fmt.Sprintf("    Balance Due: $%.2f\n", settlement.BalanceDue)
		} else if settlement.RefundDue > 0 {
			summary += fmt.Sprintf("    Refund Due: $%.2f\n", settlement.RefundDue)
		}
	}

	return summary
}

// EstimateUnderWithholding calculates if current withholding is sufficient
func (tpm *TaxPaymentManager) EstimateUnderWithholding(projectedTaxLiability float64) float64 {
	projectedTotalPayments := tpm.schedule.TotalWithholdingYTD + tpm.schedule.TotalEstimatedYTD
	underWithholding := math.Max(0, projectedTaxLiability-projectedTotalPayments)
	return underWithholding
}
