package engine

import (
	"fmt"
	"math"
	"time"
)

// Simplified ledger implementation following LEDGER.md principles
// This implements basic double-entry accounting for financial events

// AccountType defines the category of an account according to the accounting equation
type LedgerAccountType string

const (
	LedgerAsset     LedgerAccountType = "ASSET"
	LedgerLiability LedgerAccountType = "LIABILITY"
	LedgerEquity    LedgerAccountType = "EQUITY"
	LedgerIncome    LedgerAccountType = "INCOME"
	LedgerExpense   LedgerAccountType = "EXPENSE"
)

// NormalBalance indicates whether an account is naturally increased by a debit or a credit
type NormalBalance string

const (
	DebitBalance  NormalBalance = "DEBIT"
	CreditBalance NormalBalance = "CREDIT"
)

// LedgerAccount represents a single 'bucket' of value in the Chart of Accounts
type LedgerAccount struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	Code          string            `json:"code"`
	Type          LedgerAccountType `json:"type"`
	NormalBalance NormalBalance     `json:"normal_balance"`
	Description   string            `json:"description"`
	CreatedAt     time.Time         `json:"created_at"`
}

// LedgerEntry represents one side of a double-entry transaction
type LedgerEntry struct {
	ID        string        `json:"id"`
	AccountID string        `json:"account_id"`
	Amount    int64         `json:"amount"` // In cents to avoid floating point issues
	Direction NormalBalance `json:"direction"`
}

// LedgerTransaction represents a balanced movement of funds between accounts
type LedgerTransaction struct {
	ID              string        `json:"id"`
	IdempotencyKey  string        `json:"idempotency_key"`
	Description     string        `json:"description"`
	Entries         []LedgerEntry `json:"entries"`
	TransactionDate time.Time     `json:"transaction_date"`
	PostedAt        time.Time     `json:"posted_at"`
}

// SimpleLedger provides basic ledger functionality for the simulation
type SimpleLedger struct {
	accounts     map[string]LedgerAccount
	transactions []LedgerTransaction
	nextEntryID  int
	nextTxnID    int
	// PERF: When true, all Record* methods become no-ops (used in MC mode)
	disabled bool
}

// NewSimpleLedger creates a new ledger with default accounts
func NewSimpleLedger() *SimpleLedger {
	ledger := &SimpleLedger{
		accounts:     make(map[string]LedgerAccount),
		transactions: make([]LedgerTransaction, 0),
		nextEntryID:  1,
		nextTxnID:    1,
	}

	// Initialize basic accounts for simulation
	ledger.addDefaultAccounts()
	return ledger
}

// addDefaultAccounts creates the basic chart of accounts for simulation
func (sl *SimpleLedger) addDefaultAccounts() {
	accounts := []LedgerAccount{
		{ID: "cash", Name: "Cash", Type: LedgerAsset, NormalBalance: DebitBalance},
		{ID: "taxable_investments", Name: "Taxable Investments", Type: LedgerAsset, NormalBalance: DebitBalance},
		{ID: "tax_deferred_investments", Name: "Tax Deferred Investments", Type: LedgerAsset, NormalBalance: DebitBalance},
		{ID: "roth_investments", Name: "Roth Investments", Type: LedgerAsset, NormalBalance: DebitBalance},
		{ID: "salary_income", Name: "Salary Income", Type: LedgerIncome, NormalBalance: CreditBalance},
		{ID: "investment_income", Name: "Investment Income", Type: LedgerIncome, NormalBalance: CreditBalance},
		{ID: "living_expenses", Name: "Living Expenses", Type: LedgerExpense, NormalBalance: DebitBalance},
		{ID: "taxes_paid", Name: "Taxes Paid", Type: LedgerExpense, NormalBalance: DebitBalance},
		{ID: "retained_earnings", Name: "Retained Earnings", Type: LedgerEquity, NormalBalance: CreditBalance},
	}

	for _, account := range accounts {
		account.CreatedAt = time.Now()
		sl.accounts[account.ID] = account
	}
}

// Reset clears the ledger state for reuse, avoiding new allocation
func (sl *SimpleLedger) Reset() {
	// Clear existing data
	for k := range sl.accounts {
		delete(sl.accounts, k)
	}
	sl.transactions = sl.transactions[:0] // Reuse slice capacity
	sl.nextEntryID = 1
	sl.nextTxnID = 1

	// Reinitialize accounts
	sl.addDefaultAccounts()
}

// RecordTransaction records a balanced transaction in the ledger
func (sl *SimpleLedger) RecordTransaction(description string, entries []LedgerEntry) error {
	// PERF: Skip all ledger work in MC mode (no one reads the ledger)
	if sl.disabled {
		return nil
	}

	// Validate that transaction is balanced
	if err := sl.validateTransaction(entries); err != nil {
		return fmt.Errorf("transaction validation failed: %v", err)
	}

	// Create transaction
	txnID := fmt.Sprintf("txn_%d", sl.nextTxnID)
	sl.nextTxnID++

	// Assign IDs to entries
	for i := range entries {
		entries[i].ID = fmt.Sprintf("entry_%d", sl.nextEntryID)
		sl.nextEntryID++
	}

	transaction := LedgerTransaction{
		ID:              txnID,
		IdempotencyKey:  txnID, // Simplified - would use external key in production
		Description:     description,
		Entries:         entries,
		TransactionDate: time.Now(),
		PostedAt:        time.Now(),
	}

	sl.transactions = append(sl.transactions, transaction)
	return nil
}

// validateTransaction ensures transaction follows double-entry rules
func (sl *SimpleLedger) validateTransaction(entries []LedgerEntry) error {
	if len(entries) < 2 {
		return fmt.Errorf("transaction must have at least 2 entries")
	}

	totalDebits := int64(0)
	totalCredits := int64(0)

	for _, entry := range entries {
		// Validate account exists
		if _, exists := sl.accounts[entry.AccountID]; !exists {
			return fmt.Errorf("account %s does not exist", entry.AccountID)
		}

		// Validate amount is positive
		if entry.Amount <= 0 {
			return fmt.Errorf("entry amount must be positive: %d", entry.Amount)
		}

		// Sum debits and credits
		if entry.Direction == DebitBalance {
			totalDebits += entry.Amount
		} else {
			totalCredits += entry.Amount
		}
	}

	// Validate balance
	if totalDebits != totalCredits {
		return fmt.Errorf("transaction is not balanced: debits=%d, credits=%d", totalDebits, totalCredits)
	}

	return nil
}

// RecordIncome records income using double-entry accounting
func (sl *SimpleLedger) RecordIncome(amount float64, incomeType string) error {
	amountCents := int64(amount * 100)

	entries := []LedgerEntry{
		{AccountID: "cash", Amount: amountCents, Direction: DebitBalance},
		{AccountID: "salary_income", Amount: amountCents, Direction: CreditBalance},
	}

	return sl.RecordTransaction(fmt.Sprintf("Income: %s", incomeType), entries)
}

// RecordExpense records an expense using double-entry accounting
func (sl *SimpleLedger) RecordExpense(amount float64, expenseType string) error {
	amountCents := int64(amount * 100)

	entries := []LedgerEntry{
		{AccountID: "living_expenses", Amount: amountCents, Direction: DebitBalance},
		{AccountID: "cash", Amount: amountCents, Direction: CreditBalance},
	}

	return sl.RecordTransaction(fmt.Sprintf("Expense: %s", expenseType), entries)
}

// RecordInvestment records an investment purchase using double-entry accounting
func (sl *SimpleLedger) RecordInvestment(amount float64, accountType string) error {
	amountCents := int64(amount * 100)

	var investmentAccount string
	switch accountType {
	case "taxable":
		investmentAccount = "taxable_investments"
	case "tax_deferred":
		investmentAccount = "tax_deferred_investments"
	case "roth":
		investmentAccount = "roth_investments"
	default:
		investmentAccount = "taxable_investments"
	}

	entries := []LedgerEntry{
		{AccountID: investmentAccount, Amount: amountCents, Direction: DebitBalance},
		{AccountID: "cash", Amount: amountCents, Direction: CreditBalance},
	}

	return sl.RecordTransaction(fmt.Sprintf("Investment: %s", accountType), entries)
}

// GetAccountBalance calculates the current balance of an account
func (sl *SimpleLedger) GetAccountBalance(accountID string) (float64, error) {
	account, exists := sl.accounts[accountID]
	if !exists {
		return 0, fmt.Errorf("account %s does not exist", accountID)
	}

	balance := int64(0)

	for _, txn := range sl.transactions {
		for _, entry := range txn.Entries {
			if entry.AccountID == accountID {
				if entry.Direction == account.NormalBalance {
					balance += entry.Amount
				} else {
					balance -= entry.Amount
				}
			}
		}
	}

	return float64(balance) / 100.0, nil
}

// GetNetWorth calculates total net worth from ledger balances (Assets - Liabilities)
func (sl *SimpleLedger) GetNetWorth() (float64, error) {
	totalAssets := 0.0
	totalLiabilities := 0.0

	// Calculate all account balances and categorize by type
	for accountID, account := range sl.accounts {
		balance, err := sl.GetAccountBalance(accountID)
		if err != nil {
			return 0, fmt.Errorf("failed to get balance for %s: %v", accountID, err)
		}

		switch account.Type {
		case LedgerAsset:
			totalAssets += balance
		case LedgerLiability:
			totalLiabilities += balance
		}
	}

	// Net Worth = Assets - Liabilities
	return totalAssets - totalLiabilities, nil
}

// ValidateLedgerBalance ensures the accounting equation is maintained
func (sl *SimpleLedger) ValidateLedgerBalance() error {
	totalAssets := 0.0
	totalLiabilities := 0.0
	totalEquity := 0.0
	totalRevenue := 0.0
	totalExpenses := 0.0

	for accountID, account := range sl.accounts {
		balance, err := sl.GetAccountBalance(accountID)
		if err != nil {
			return fmt.Errorf("failed to get balance for %s: %v", accountID, err)
		}

		switch account.Type {
		case LedgerAsset:
			totalAssets += balance
		case LedgerLiability:
			totalLiabilities += balance
		case LedgerEquity:
			totalEquity += balance
		case LedgerIncome:
			totalRevenue += balance
		case LedgerExpense:
			totalExpenses += balance
		}
	}

	// Basic accounting equation: Assets = Liabilities + Equity + (Revenue - Expenses)
	leftSide := totalAssets
	rightSide := totalLiabilities + totalEquity + (totalRevenue - totalExpenses)

	tolerance := 0.01 // 1 cent tolerance for floating point errors
	if math.Abs(leftSide-rightSide) > tolerance {
		return fmt.Errorf("accounting equation not balanced: Assets=%.2f, Liabilities+Equity+Net Income=%.2f",
			leftSide, rightSide)
	}

	return nil
}
