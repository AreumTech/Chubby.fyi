package engine

// withdrawal_sequencing.go
// Intelligent withdrawal sequencing engine for tax-efficient retirement distributions
// Reference: Python robo-advisor Chapter 9

import (
	"fmt"
	"math"
)

// WithdrawalSequencer handles intelligent account withdrawal ordering
type WithdrawalSequencer struct {
	cashManager   *CashManager
	taxCalculator *TaxCalculator
	rmdCalculator *RMDCalculator
}

// NewWithdrawalSequencer creates a new withdrawal sequencer
func NewWithdrawalSequencer(cashMgr *CashManager, taxCalc *TaxCalculator, rmdCalc *RMDCalculator) *WithdrawalSequencer {
	return &WithdrawalSequencer{
		cashManager:   cashMgr,
		taxCalculator: taxCalc,
		rmdCalculator: rmdCalc,
	}
}

// WithdrawalRequest represents a withdrawal need
type WithdrawalRequest struct {
	Amount              float64
	CurrentAge          int
	CurrentMonth        int
	AnnualSpendingNeed  float64
	MinimumSpending     float64 // Essential expenses floor
}

// WithdrawalResult contains the outcome of a withdrawal operation
type WithdrawalResult struct {
	TotalWithdrawn      float64
	CashWithdrawn       float64
	TaxableWithdrawn    float64
	TaxDeferredWithdrawn float64
	RothWithdrawn       float64
	RMDAmount           float64
	EstimatedTaxOwed    float64
	WithdrawalSequence  []string
}

// ExecuteWithdrawal performs intelligent withdrawal with the specified strategy
func (ws *WithdrawalSequencer) ExecuteWithdrawal(
	request WithdrawalRequest,
	accounts *AccountHoldingsMonthEnd,
	sequence WithdrawalSequence,
) (*WithdrawalResult, error) {
	result := &WithdrawalResult{
		WithdrawalSequence: make([]string, 0),
	}

	// Check for RMDs first (mandatory withdrawals)
	if request.CurrentAge >= 73 {
		rmdAmount := ws.rmdCalculator.CalculateTotalRMDs(request.CurrentAge, accounts)
		if rmdAmount > 0 {
			result.RMDAmount = rmdAmount
			// RMD must be withdrawn from tax-deferred accounts
			if accounts.TaxDeferred != nil && accounts.TaxDeferred.TotalValue >= rmdAmount {
				result.TaxDeferredWithdrawn += rmdAmount
				accounts.TaxDeferred.TotalValue -= rmdAmount
				accounts.Cash += rmdAmount
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("RMD: $%.0f from Tax-Deferred (mandatory)", rmdAmount))
			}
		}
	}

	// Determine withdrawal order based on strategy
	var accountOrder []string
	switch sequence {
	case WithdrawalSequenceTaxEfficient:
		accountOrder = []string{"cash", "taxable", "tax_deferred", "roth"}
	case WithdrawalSequenceTaxDeferredFirst:
		accountOrder = []string{"cash", "tax_deferred", "taxable", "roth"}
	case WithdrawalSequenceCashFirst:
		accountOrder = []string{"cash", "taxable", "tax_deferred", "roth"}
	default:
		accountOrder = []string{"cash", "taxable", "tax_deferred", "roth"}
	}

	remaining := request.Amount - result.TotalWithdrawn

	// Withdraw from accounts in order
	for _, accountType := range accountOrder {
		if remaining <= 0.01 {
			break
		}

		var withdrawn float64
		var err error

		switch accountType {
		case "cash":
			withdrawn, err = ws.withdrawFromCash(accounts, remaining)
			if withdrawn > 0 {
				result.CashWithdrawn += withdrawn
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("Cash: $%.0f", withdrawn))
			}

		case "taxable":
			withdrawn, err = ws.withdrawFromTaxable(accounts, remaining, request.CurrentMonth)
			if withdrawn > 0 {
				result.TaxableWithdrawn += withdrawn
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("Taxable: $%.0f", withdrawn))
			}

		case "tax_deferred":
			withdrawn, err = ws.withdrawFromTaxDeferred(accounts, remaining, request.CurrentMonth)
			if withdrawn > 0 {
				result.TaxDeferredWithdrawn += withdrawn
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("Tax-Deferred: $%.0f", withdrawn))
			}

		case "roth":
			withdrawn, err = ws.withdrawFromRoth(accounts, remaining, request.CurrentMonth)
			if withdrawn > 0 {
				result.RothWithdrawn += withdrawn
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("Roth: $%.0f (tax-free)", withdrawn))
			}
		}

		if err != nil {
			// Log but continue to next account
			simLogEvent("WARN  Withdrawal error from %s: %v", accountType, err)
		}

		result.TotalWithdrawn += withdrawn
		remaining -= withdrawn
	}

	// Check if we met the withdrawal need
	if result.TotalWithdrawn < request.Amount && request.Amount-result.TotalWithdrawn > 0.01 {
		return result, fmt.Errorf("insufficient funds: needed $%.2f, withdrew $%.2f",
			request.Amount, result.TotalWithdrawn)
	}

	return result, nil
}

// withdrawFromCash withdraws from cash reserves
func (ws *WithdrawalSequencer) withdrawFromCash(accounts *AccountHoldingsMonthEnd, amount float64) (float64, error) {
	available := accounts.Cash
	if available <= 0 {
		return 0, nil
	}

	withdraw := math.Min(amount, available)
	accounts.Cash -= withdraw

	return withdraw, nil
}

// withdrawFromTaxable withdraws from taxable account with capital gains tracking
func (ws *WithdrawalSequencer) withdrawFromTaxable(
	accounts *AccountHoldingsMonthEnd,
	amount float64,
	currentMonth int,
) (float64, error) {
	if accounts.Taxable == nil || accounts.Taxable.TotalValue <= 0 {
		return 0, nil
	}

	available := accounts.Taxable.TotalValue
	withdraw := math.Min(amount, available)

	// If account has holdings, sell using FIFO
	if len(accounts.Taxable.Holdings) > 0 {
		saleResult := ws.cashManager.SellAssetsFromAccountFIFO(accounts.Taxable, withdraw, currentMonth)
		accounts.Cash += saleResult.TotalProceeds
		return saleResult.TotalProceeds, nil
	}

	// Otherwise, directly reduce TotalValue (simplified for testing)
	accounts.Taxable.TotalValue -= withdraw
	accounts.Cash += withdraw

	return withdraw, nil
}

// withdrawFromTaxDeferred withdraws from tax-deferred account (IRA, 401k)
func (ws *WithdrawalSequencer) withdrawFromTaxDeferred(
	accounts *AccountHoldingsMonthEnd,
	amount float64,
	currentMonth int,
) (float64, error) {
	if accounts.TaxDeferred == nil || accounts.TaxDeferred.TotalValue <= 0 {
		return 0, nil
	}

	available := accounts.TaxDeferred.TotalValue
	withdraw := math.Min(amount, available)

	// If account has holdings, sell using FIFO
	if len(accounts.TaxDeferred.Holdings) > 0 {
		saleResult := ws.cashManager.SellAssetsFromAccountFIFO(accounts.TaxDeferred, withdraw, currentMonth)
		accounts.Cash += saleResult.TotalProceeds
		return saleResult.TotalProceeds, nil
	}

	// Otherwise, directly reduce TotalValue (simplified for testing)
	accounts.TaxDeferred.TotalValue -= withdraw
	accounts.Cash += withdraw

	return withdraw, nil
}

// withdrawFromRoth withdraws from Roth account (tax-free)
func (ws *WithdrawalSequencer) withdrawFromRoth(
	accounts *AccountHoldingsMonthEnd,
	amount float64,
	currentMonth int,
) (float64, error) {
	if accounts.Roth == nil || accounts.Roth.TotalValue <= 0 {
		return 0, nil
	}

	available := accounts.Roth.TotalValue
	withdraw := math.Min(amount, available)

	// If account has holdings, sell using FIFO
	if len(accounts.Roth.Holdings) > 0 {
		saleResult := ws.cashManager.SellAssetsFromAccountFIFO(accounts.Roth, withdraw, currentMonth)
		accounts.Cash += saleResult.TotalProceeds
		return saleResult.TotalProceeds, nil
	}

	// Otherwise, directly reduce TotalValue (simplified for testing)
	accounts.Roth.TotalValue -= withdraw
	accounts.Cash += withdraw

	return withdraw, nil
}

// CalculateGrossUpAmount calculates the gross IRA withdrawal needed for a target net amount
// Accounts for taxes that will be owed on the IRA distribution
func (ws *WithdrawalSequencer) CalculateGrossUpAmount(
	netNeeded float64,
	priorTaxableIncome float64,
	filingStatus FilingStatus,
	standardDeduction float64,
) float64 {
	// Simplified gross-up calculation
	// For more accuracy, would need to iterate to find exact amount

	// Estimate marginal tax rate based on prior income
	marginalRate := ws.estimateMarginalRate(priorTaxableIncome, filingStatus)

	// Gross up: gross * (1 - rate) = net
	// Therefore: gross = net / (1 - rate)
	grossAmount := netNeeded / (1.0 - marginalRate)

	return grossAmount
}

// estimateMarginalRate estimates the marginal tax rate for a given income level
func (ws *WithdrawalSequencer) estimateMarginalRate(taxableIncome float64, filingStatus FilingStatus) float64 {
	// 2024 federal tax brackets (simplified)
	// This should use the actual tax calculator, but for now use approximation

	if filingStatus == FilingStatusMarriedFilingJointly {
		// MFJ brackets
		if taxableIncome <= 22000 {
			return 0.10
		} else if taxableIncome <= 89075 {
			return 0.12
		} else if taxableIncome <= 190750 {
			return 0.22
		} else if taxableIncome <= 364200 {
			return 0.24
		} else if taxableIncome <= 462500 {
			return 0.32
		} else if taxableIncome <= 693750 {
			return 0.35
		} else {
			return 0.37
		}
	} else {
		// Single brackets
		if taxableIncome <= 11000 {
			return 0.10
		} else if taxableIncome <= 44725 {
			return 0.12
		} else if taxableIncome <= 95375 {
			return 0.22
		} else if taxableIncome <= 182100 {
			return 0.24
		} else if taxableIncome <= 231250 {
			return 0.32
		} else if taxableIncome <= 578125 {
			return 0.35
		} else {
			return 0.37
		}
	}
}

// CalculateRoomInBracket calculates how much more income fits in current tax bracket
func (ws *WithdrawalSequencer) CalculateRoomInBracket(
	currentTaxableIncome float64,
	filingStatus FilingStatus,
) float64 {
	// Find the top of the current bracket
	var bracketTop float64

	if filingStatus == FilingStatusMarriedFilingJointly {
		// MFJ brackets
		if currentTaxableIncome <= 22000 {
			bracketTop = 22000
		} else if currentTaxableIncome <= 89075 {
			bracketTop = 89075
		} else if currentTaxableIncome <= 190750 {
			bracketTop = 190750
		} else if currentTaxableIncome <= 364200 {
			bracketTop = 364200
		} else if currentTaxableIncome <= 462500 {
			bracketTop = 462500
		} else if currentTaxableIncome <= 693750 {
			bracketTop = 693750
		} else {
			return 0 // At top bracket
		}
	} else {
		// Single brackets
		if currentTaxableIncome <= 11000 {
			bracketTop = 11000
		} else if currentTaxableIncome <= 44725 {
			bracketTop = 44725
		} else if currentTaxableIncome <= 95375 {
			bracketTop = 95375
		} else if currentTaxableIncome <= 182100 {
			bracketTop = 182100
		} else if currentTaxableIncome <= 231250 {
			bracketTop = 231250
		} else if currentTaxableIncome <= 578125 {
			bracketTop = 578125
		} else {
			return 0 // At top bracket
		}
	}

	return math.Max(0, bracketTop-currentTaxableIncome)
}

// ExecuteWithdrawalWithBracketFilling performs withdrawal with strategic IRA bracket filling
// This is the "tax arbitrage" strategy from Chapter 9
func (ws *WithdrawalSequencer) ExecuteWithdrawalWithBracketFilling(
	request WithdrawalRequest,
	accounts *AccountHoldingsMonthEnd,
	targetBracketTop float64, // e.g., fill up to 24% bracket
	filingStatus FilingStatus,
	standardDeduction float64,
	currentYTDIncome float64,
) (*WithdrawalResult, error) {
	result := &WithdrawalResult{
		WithdrawalSequence: make([]string, 0),
	}

	// Calculate how much room we have in the target bracket
	currentTaxableIncome := math.Max(0, currentYTDIncome-standardDeduction)
	roomInBracket := targetBracketTop - currentTaxableIncome

	// First, handle RMDs (mandatory)
	if request.CurrentAge >= 73 {
		rmdAmount := ws.rmdCalculator.CalculateTotalRMDs(request.CurrentAge, accounts)
		if rmdAmount > 0 {
			result.RMDAmount = rmdAmount
			if accounts.TaxDeferred != nil && accounts.TaxDeferred.TotalValue >= rmdAmount {
				result.TaxDeferredWithdrawn += rmdAmount
				accounts.TaxDeferred.TotalValue -= rmdAmount
				accounts.Cash += rmdAmount
				result.WithdrawalSequence = append(result.WithdrawalSequence,
					fmt.Sprintf("RMD: $%.0f (mandatory)", rmdAmount))
				roomInBracket -= rmdAmount // RMD uses up bracket space
			}
		}
	}

	// Now handle spending needs
	remaining := request.Amount

	// Strategy: Fill lower bracket with IRA withdrawals if we have room
	if roomInBracket > 0 && accounts.TaxDeferred != nil && accounts.TaxDeferred.TotalValue > 0 {
		// Take IRA withdrawals to fill the bracket, even if not needed for spending
		iraWithdrawal := math.Min(roomInBracket, accounts.TaxDeferred.TotalValue)
		iraWithdrawal = math.Min(iraWithdrawal, remaining) // Don't over-withdraw

		if iraWithdrawal > 0 {
			accounts.TaxDeferred.TotalValue -= iraWithdrawal
			accounts.Cash += iraWithdrawal
			result.TaxDeferredWithdrawn += iraWithdrawal
			result.WithdrawalSequence = append(result.WithdrawalSequence,
				fmt.Sprintf("Tax-Deferred (bracket fill): $%.0f", iraWithdrawal))
			remaining -= iraWithdrawal
		}
	}

	// Cover remaining spending need from taxable/cash (tax-efficient)
	if remaining > 0 {
		// Cash first
		if accounts.Cash > 0 {
			cashWithdraw := math.Min(remaining, accounts.Cash)
			accounts.Cash -= cashWithdraw
			result.CashWithdrawn += cashWithdraw
			result.WithdrawalSequence = append(result.WithdrawalSequence,
				fmt.Sprintf("Cash: $%.0f", cashWithdraw))
			remaining -= cashWithdraw
		}

		// Taxable next
		if remaining > 0 && accounts.Taxable != nil && accounts.Taxable.TotalValue > 0 {
			withdrawn, _ := ws.withdrawFromTaxable(accounts, remaining, request.CurrentMonth)
			result.TaxableWithdrawn += withdrawn
			result.WithdrawalSequence = append(result.WithdrawalSequence,
				fmt.Sprintf("Taxable: $%.0f", withdrawn))
			remaining -= withdrawn
		}

		// Roth last resort
		if remaining > 0 && accounts.Roth != nil && accounts.Roth.TotalValue > 0 {
			withdrawn, _ := ws.withdrawFromRoth(accounts, remaining, request.CurrentMonth)
			result.RothWithdrawn += withdrawn
			result.WithdrawalSequence = append(result.WithdrawalSequence,
				fmt.Sprintf("Roth: $%.0f (tax-free)", withdrawn))
			remaining -= withdrawn
		}
	}

	result.TotalWithdrawn = result.CashWithdrawn + result.TaxableWithdrawn +
		result.TaxDeferredWithdrawn + result.RothWithdrawn

	if remaining > 0.01 {
		return result, fmt.Errorf("insufficient funds for withdrawal")
	}

	return result, nil
}
