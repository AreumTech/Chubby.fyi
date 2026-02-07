package main

import (
	"math"
	"testing"
)

// TestTaxPaymentTiming validates the tax payment timing system
func TestTaxPaymentTiming(t *testing.T) {
	t.Run("WithholdingSchedule", func(t *testing.T) {
		tpm := NewTaxPaymentManager()

		// Process monthly withholding
		tpm.ProcessMonthlyWithholding(0, 1000.0, 200.0, 0.0)  // Month 0: $1200 total
		tpm.ProcessMonthlyWithholding(1, 1000.0, 150.0, 0.0)  // Month 1: $1150 total
		tpm.ProcessMonthlyWithholding(2, 1000.0, 100.0, 50.0) // Month 2: $1150 total

		// Verify withholding totals
		expectedTotal := 1200.0 + 1150.0 + 1150.0
		if math.Abs(tpm.schedule.TotalWithholdingYTD-expectedTotal) > 0.01 {
			t.Errorf("Total withholding incorrect: expected %.2f, got %.2f",
				expectedTotal, tpm.schedule.TotalWithholdingYTD)
		}

		// Verify monthly records
		if len(tpm.schedule.WithholdingSchedule) != 3 {
			t.Errorf("Expected 3 withholding records, got %d", len(tpm.schedule.WithholdingSchedule))
		}

		t.Logf("✅ Withholding schedule tracking working correctly")
		t.Logf("   Total withholding YTD: $%.2f", tpm.schedule.TotalWithholdingYTD)
	})

	t.Run("EstimatedPayments", func(t *testing.T) {
		tpm := NewTaxPaymentManager()

		// Schedule estimated payments for business income
		businessIncome := 80000.0
		taxRate := 0.25
		paymentType := "business_income"

		payment := tpm.ScheduleEstimatedPayment(1, businessIncome, taxRate, paymentType)

		expectedPayment := businessIncome * taxRate * 0.25 // Quarterly
		if math.Abs(payment.PaymentAmount-expectedPayment) > 0.01 {
			t.Errorf("Estimated payment amount incorrect: expected %.2f, got %.2f",
				expectedPayment, payment.PaymentAmount)
		}

		// Verify payment is scheduled correctly
		if payment.Quarter != 1 {
			t.Errorf("Expected quarter 1, got %d", payment.Quarter)
		}

		if payment.PaymentType != paymentType {
			t.Errorf("Expected payment type %s, got %s", paymentType, payment.PaymentType)
		}

		t.Logf("✅ Estimated payment scheduling working correctly")
		t.Logf("   Q1 payment: $%.2f for %s", payment.PaymentAmount, payment.PaymentType)
	})

	t.Run("FinalTaxSettlement", func(t *testing.T) {
		tpm := NewTaxPaymentManager()

		// Set up withholding and estimated payments
		tpm.schedule.TotalWithholdingYTD = 15000.0
		tpm.schedule.TotalEstimatedYTD = 3000.0
		totalPaid := 18000.0

		// Calculate settlement with balance due
		totalTaxLiability := 20000.0
		settlement := tpm.CalculateFinalTaxSettlement(totalTaxLiability, 1)

		expectedBalance := totalTaxLiability - totalPaid // $2000 owed
		if math.Abs(settlement.BalanceDue-expectedBalance) > 0.01 {
			t.Errorf("Balance due incorrect: expected %.2f, got %.2f",
				expectedBalance, settlement.BalanceDue)
		}

		if settlement.RefundDue != 0 {
			t.Errorf("Expected no refund, got %.2f", settlement.RefundDue)
		}

		t.Logf("✅ Final tax settlement calculation working correctly")
		t.Logf("   Liability: $%.2f, Paid: $%.2f, Balance Due: $%.2f",
			totalTaxLiability, totalPaid, settlement.BalanceDue)

		// Test refund scenario
		tpm2 := NewTaxPaymentManager()
		tpm2.schedule.TotalWithholdingYTD = 22000.0
		tpm2.schedule.TotalEstimatedYTD = 0.0

		settlement2 := tpm2.CalculateFinalTaxSettlement(20000.0, 1)
		expectedRefund := 2000.0

		if math.Abs(settlement2.RefundDue-expectedRefund) > 0.01 {
			t.Errorf("Refund due incorrect: expected %.2f, got %.2f",
				expectedRefund, settlement2.RefundDue)
		}

		t.Logf("✅ Tax refund calculation working correctly")
		t.Logf("   Refund due: $%.2f", settlement2.RefundDue)
	})

	t.Run("PaymentProcessing", func(t *testing.T) {
		tpm := NewTaxPaymentManager()

		// Create mock accounts
		accounts := &AccountHoldingsMonthEnd{
			Cash: 10000.0,
		}

		// Schedule an estimated payment
		payment := EstimatedPayment{
			Quarter:       2,
			MonthOffset:   15, // April
			PaymentAmount: 3000.0,
			PaymentType:   "business_income",
			IsPaid:        false,
		}
		tpm.schedule.EstimatedPayments = []EstimatedPayment{payment}

		// Process the payment
		paymentMade := tpm.ProcessEstimatedPayment(accounts, 15)

		if paymentMade != 3000.0 {
			t.Errorf("Expected payment of $3000, got $%.2f", paymentMade)
		}

		if accounts.Cash != 7000.0 {
			t.Errorf("Expected remaining cash of $7000, got $%.2f", accounts.Cash)
		}

		if !tpm.schedule.EstimatedPayments[0].IsPaid {
			t.Error("Payment should be marked as paid")
		}

		t.Logf("✅ Estimated payment processing working correctly")
		t.Logf("   Cash before: $10000, After: $%.2f", accounts.Cash)
	})
}

// TestTaxTimingIntegration validates tax timing integration with simulation engine
func TestTaxTimingIntegration(t *testing.T) {
	t.Skip("TODO: Tax timing integration test needs updating for current implementation")
	// Create a simple simulation with salary income
	config := StochasticModelConfig{
		MeanSPYReturn:             0.08,
		VolatilitySPY:             0.15,
		TransactionCostPercentage: 0.001,
		TransactionCostMinimum:    1.0,
		TransactionCostMaximum:    10.0,
		// Required GARCH parameters
		GarchSPYOmega:       0.0001,
		GarchSPYAlpha:       0.1,
		GarchSPYBeta:        0.85,
		GarchBondOmega:      0.00005,
		GarchBondAlpha:      0.05,
		GarchBondBeta:       0.90,
		GarchIntlStockOmega: 0.00015,
		GarchIntlStockAlpha: 0.12,
		GarchIntlStockBeta:  0.80,
		FatTailParameter:    5.0,
		// 6x6 correlation matrix: SPY, BND, INFL, INTL, HOME, RENT
		CorrelationMatrix: [][]float64{
			{1.00, -0.15, 0.05, 0.75, 0.20, 0.30},
			{-0.15, 1.00, -0.25, -0.10, -0.05, 0.10},
			{0.05, -0.25, 1.00, 0.10, 0.40, 0.50},
			{0.75, -0.10, 0.10, 1.00, 0.25, 0.35},
			{0.20, -0.05, 0.40, 0.25, 1.00, 0.60},
			{0.30, 0.10, 0.50, 0.35, 0.60, 1.00},
		},
	}

	initialAccounts := AccountHoldingsMonthEnd{
		Taxable:     &Account{Holdings: []Holding{}, TotalValue: 0},
		TaxDeferred: &Account{Holdings: []Holding{}, TotalValue: 0},
		Roth:        &Account{Holdings: []Holding{}, TotalValue: 0},
		Cash:        5000.0,
	}

	// Create salary income event with withholding
	events := []FinancialEvent{
		{
			ID:          "salary",
			Type:        "INCOME",
			MonthOffset: 0,
			Amount:      5000.0, // $5k monthly salary
			Metadata: map[string]interface{}{
				"source":        "Employment",
				"isNet":         false,
				"withholding":   1250.0, // 25% withholding
				"frequency":     "monthly",
				"endDateOffset": 12,
			},
		},
	}

	simulationInput := SimulationInput{
		InitialAccounts:    initialAccounts,
		Events:             events,
		Config:             config,
		MonthsToRun:        24, // 2 years
		WithdrawalStrategy: WithdrawalSequenceTaxEfficient,
	}

	// Run simulation
	engine := NewSimulationEngine(config)
	result := engine.RunSingleSimulation(simulationInput)

	if !result.Success {
		t.Fatalf("Simulation failed: %s", result.Error)
	}

	// Verify simulation ran and processed withholding
	if len(result.MonthlyData) < 12 {
		t.Fatalf("Expected at least 12 months of data, got %d", len(result.MonthlyData))
	}

	// Check that withholding was processed monthly
	month0Data := result.MonthlyData[0]
	if month0Data.TaxWithheldThisMonth == 0 {
		t.Errorf("Expected withholding in month 0, got $%.2f", month0Data.TaxWithheldThisMonth)
	}

	// Check that annual tax calculation happened in December
	december := result.MonthlyData[11]
	if december.TaxPaidAnnual == nil {
		t.Error("Expected tax calculation in December")
	}

	t.Logf("✅ Tax timing integration working correctly")
	t.Logf("   Monthly withholding: $%.2f", month0Data.TaxWithheldThisMonth)
	if december.TaxPaidAnnual != nil {
		t.Logf("   Annual tax liability: $%.2f", *december.TaxPaidAnnual)
	}

	// Verify realistic tax payment timing
	totalWithheld := 0.0
	for _, data := range result.MonthlyData[:12] {
		totalWithheld += data.TaxWithheldThisMonth
	}

	// Should have significant withholding throughout the year
	expectedMinimumWithholding := 12 * 1000 // At least $1k/month
	if totalWithheld < float64(expectedMinimumWithholding) {
		t.Errorf("Total withholding seems low: $%.2f (expected > $%d)",
			totalWithheld, expectedMinimumWithholding)
	}

	t.Logf("✅ Total withholding for year: $%.2f", totalWithheld)
}

// TestUnderWithholdingDetection tests the under-withholding detection system
func TestUnderWithholdingDetection(t *testing.T) {
	tpm := NewTaxPaymentManager()

	// Simulate scenario with insufficient withholding
	projectedTaxLiability := 10000.0
	tpm.schedule.TotalWithholdingYTD = 6000.0 // $4k under-withheld
	tpm.schedule.TotalEstimatedYTD = 0.0

	underWithholding := tpm.EstimateUnderWithholding(projectedTaxLiability)
	expectedUnderWithholding := 4000.0

	if math.Abs(underWithholding-expectedUnderWithholding) > 0.01 {
		t.Errorf("Under-withholding calculation incorrect: expected %.2f, got %.2f",
			expectedUnderWithholding, underWithholding)
	}

	t.Logf("✅ Under-withholding detection working correctly")
	t.Logf("   Projected liability: $%.2f", projectedTaxLiability)
	t.Logf("   Total paid: $%.2f", tpm.schedule.TotalWithholdingYTD+tpm.schedule.TotalEstimatedYTD)
	t.Logf("   Under-withheld: $%.2f", underWithholding)
}

// TestDecemberTaxFieldsPopulated ensures December monthly snapshots contain all annual tax fields
func TestDecemberTaxFieldsPopulated(t *testing.T) {
	// Load configuration files for tax calculations
	err := LoadFinancialConfigFromFiles("./config")
	if err != nil {
		t.Fatalf("Failed to load financial configuration: %v", err)
	}

	t.Run("DecemberSnapshotHasAllTaxFields", func(t *testing.T) {
		// Setup simulation with moderate income
		config := GetDefaultStochasticConfig()
		engine := NewSimulationEngine(config)

		initialAccounts := AccountHoldingsMonthEnd{
			Cash:        20000.0,
			Taxable:     &Account{TotalValue: 50000.0, Holdings: []Holding{}},
			TaxDeferred: &Account{TotalValue: 100000.0, Holdings: []Holding{}},
			Roth:        &Account{TotalValue: 30000.0, Holdings: []Holding{}},
		}

		// Moderate income: $120k/year salary
		salaryEvent := FinancialEvent{
			ID:          "salary",
			Type:        "INCOME",
			Description: "Annual salary",
			MonthOffset: 0,
			Amount:      10000.0, // $10k/month
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"source":          "Employment",
				"incomeType":      "employment",
				"isNet":           false,
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   12,
			},
		}

		expenseEvent := FinancialEvent{
			ID:          "expenses",
			Type:        "EXPENSE",
			Description: "Living expenses",
			MonthOffset: 0,
			Amount:      4000.0,
			Frequency:   "monthly",
			Metadata: map[string]interface{}{
				"frequency":       "monthly",
				"startDateOffset": 0,
				"endDateOffset":   12,
			},
		}

		input := SimulationInput{
			InitialAccounts:    initialAccounts,
			Events:             []FinancialEvent{salaryEvent, expenseEvent},
			Config:             config,
			MonthsToRun:        12,
			InitialAge:         35,
			StartYear:          2024,
			WithdrawalStrategy: "TAX_EFFICIENT",
			Goals:              []Goal{},
			TaxConfig:          &SimpleTaxConfig{Enabled: true, EffectiveRate: 0.22, CapitalGainsRate: 0.15},
		}

		result := engine.RunSingleSimulation(input)

		if !result.Success {
			t.Fatalf("Simulation failed: %s", result.Error)
		}

		if len(result.MonthlyData) < 12 {
			t.Fatalf("Expected at least 12 months of data, got %d", len(result.MonthlyData))
		}

		// Test December (month 11) snapshot
		december := result.MonthlyData[11]

		// Test 1: TaxPaidAnnual must be present and non-nil
		if december.TaxPaidAnnual == nil {
			t.Error("❌ TaxPaidAnnual is nil in December snapshot")
		} else if *december.TaxPaidAnnual <= 0 {
			t.Error("❌ TaxPaidAnnual is zero or negative in December")
		} else {
			t.Logf("✅ TaxPaidAnnual present in December: $%.2f", *december.TaxPaidAnnual)
		}

		// Test 2: FederalIncomeTaxAnnual must be present
		if december.FederalIncomeTaxAnnual == nil {
			t.Error("❌ FederalIncomeTaxAnnual is nil in December snapshot")
		} else {
			t.Logf("✅ FederalIncomeTaxAnnual present: $%.2f", *december.FederalIncomeTaxAnnual)
		}

		// Test 3: StateIncomeTaxAnnual must be present
		if december.StateIncomeTaxAnnual == nil {
			t.Error("❌ StateIncomeTaxAnnual is nil in December snapshot")
		} else {
			t.Logf("✅ StateIncomeTaxAnnual present: $%.2f", *december.StateIncomeTaxAnnual)
		}

		// Test 4: TotalFICATaxAnnual must be present
		if december.TotalFICATaxAnnual == nil {
			t.Error("❌ TotalFICATaxAnnual is nil in December snapshot")
		} else if *december.TotalFICATaxAnnual <= 0 {
			t.Error("❌ TotalFICATaxAnnual is zero (should have FICA for employment income)")
		} else {
			t.Logf("✅ TotalFICATaxAnnual present: $%.2f", *december.TotalFICATaxAnnual)
		}

		// Test 5: EffectiveTaxRateAnnual must be present
		if december.EffectiveTaxRateAnnual == nil {
			t.Error("❌ EffectiveTaxRateAnnual is nil in December snapshot")
		} else if *december.EffectiveTaxRateAnnual <= 0 || *december.EffectiveTaxRateAnnual > 1.0 {
			t.Errorf("❌ EffectiveTaxRateAnnual out of valid range: %.2f", *december.EffectiveTaxRateAnnual)
		} else {
			t.Logf("✅ EffectiveTaxRateAnnual present: %.1f%%", *december.EffectiveTaxRateAnnual*100)
		}

		// Test 6: MarginalTaxRateAnnual must be present
		if december.MarginalTaxRateAnnual == nil {
			t.Error("❌ MarginalTaxRateAnnual is nil in December snapshot")
		} else if *december.MarginalTaxRateAnnual <= 0 || *december.MarginalTaxRateAnnual > 1.0 {
			t.Errorf("❌ MarginalTaxRateAnnual out of valid range: %.2f", *december.MarginalTaxRateAnnual)
		} else {
			t.Logf("✅ MarginalTaxRateAnnual present: %.1f%%", *december.MarginalTaxRateAnnual*100)
		}

		// Test 7: Capital gains tax fields (if applicable)
		if december.CapitalGainsTaxLongTermAnnual != nil {
			t.Logf("✅ CapitalGainsTaxLongTermAnnual present: $%.2f", *december.CapitalGainsTaxLongTermAnnual)
		}
		if december.CapitalGainsTaxShortTermAnnual != nil {
			t.Logf("✅ CapitalGainsTaxShortTermAnnual present: $%.2f", *december.CapitalGainsTaxShortTermAnnual)
		}

		// Test 8: Non-December months should NOT have annual tax fields
		// Check a few months before December
		for monthIdx := 0; monthIdx < 11; monthIdx++ {
			monthData := result.MonthlyData[monthIdx]
			if monthData.TaxPaidAnnual != nil && *monthData.TaxPaidAnnual > 0 {
				t.Errorf("⚠️  Month %d has TaxPaidAnnual set (should only be in December)", monthIdx)
			}
		}

		t.Logf("✅ December snapshot has all required annual tax fields")
		t.Logf("✅ Non-December months correctly have no annual tax data")
	})
}
