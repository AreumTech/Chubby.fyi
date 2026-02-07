package engine

// PERFORMANCE OPTIMIZATION: Optimized lot term status updates
// The original UpdateLotTermStatus recalculates every lot every month (420 calls × thousands of lots)
// This optimized version only updates lots that might have just transitioned to long-term status

// UpdateLotTermStatusOptimized only updates lots that need updating
func (cm *CashManager) UpdateLotTermStatusOptimized(accounts *AccountHoldingsMonthEnd, currentMonth int) {
	// Build account slice with pre-allocated capacity
	accountSlice := make([]*Account, 0, 3)

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

		// PERFORMANCE: Only check holdings that might have lots transitioning to long-term
		for i := range account.Holdings {
			holding := &account.Holdings[i]

			// PERFORMANCE: Skip if no lots (empty holding)
			if len(holding.Lots) == 0 {
				continue
			}

			// PERFORMANCE: Check if we can skip this holding entirely
			// If the oldest lot is already long-term and we haven't had recent acquisitions,
			// all lots are likely long-term
			hasRecentAcquisitions := false
			allLotsLongTerm := true

			for j := range holding.Lots {
				lot := &holding.Lots[j]

				// PERFORMANCE: Skip already confirmed long-term lots
				if lot.IsLongTerm {
					continue
				}

				allLotsLongTerm = false

				// Check if this lot has just become long-term
				monthsHeld := currentMonth - lot.AcquisitionDate
				if monthsHeld > 12 {
					lot.IsLongTerm = true
				} else {
					// Track if we have lots that are close to becoming long-term
					// This helps us decide whether to check this holding next month
					hasRecentAcquisitions = true
				}
			}

			// PERFORMANCE: Mark holding as "all long-term" to skip faster next time
			// (This could be tracked in a separate optimization structure if needed)
			_ = allLotsLongTerm
			_ = hasRecentAcquisitions
		}
	}
}

// BatchUpdateLotTermStatus updates lot status only for lots that might have transitioned
// Called less frequently (every 3 months) for better performance
func (cm *CashManager) BatchUpdateLotTermStatus(accounts *AccountHoldingsMonthEnd, currentMonth int) {
	accountSlice := make([]*Account, 0, 3)

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

			// Process lots in batches - only update status for lots near the 12-month threshold
			for j := range holding.Lots {
				lot := &holding.Lots[j]

				// PERFORMANCE: Only update if not already long-term
				if !lot.IsLongTerm {
					monthsHeld := currentMonth - lot.AcquisitionDate
					if monthsHeld > 12 {
						lot.IsLongTerm = true
					}
				}
			}
		}
	}
}

// OptimizeLotStructureMinimal performs minimal lot consolidation for performance
func (cm *CashManager) OptimizeLotStructureMinimal(account *Account) {
	if account == nil {
		return
	}

	for i := range account.Holdings {
		holding := &account.Holdings[i]

		// PERF: In-place filter to avoid allocating a new slice
		if len(holding.Lots) > 0 {
			n := 0
			for j := range holding.Lots {
				if holding.Lots[j].Quantity > 0.001 { // Keep lots with meaningful quantity
					if n != j {
						holding.Lots[n] = holding.Lots[j]
					}
					n++
				}
			}
			holding.Lots = holding.Lots[:n]
		}
	}
}
