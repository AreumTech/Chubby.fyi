package engine

import (
	"fmt"
)

// formatCurrency formats a number as currency
func formatCurrency(amount float64) string {
	if amount < 0 {
		return fmt.Sprintf("-$%.0f", -amount)
	}
	return fmt.Sprintf("$%.0f", amount)
}

// debugErrorf prints debug error messages
func debugErrorf(format string, args ...interface{}) {
	if VERBOSE_DEBUG {
		fmt.Printf("[ERROR] "+format+"\n", args...)
	}
}

// debugPrintf prints debug messages
func debugPrintf(format string, args ...interface{}) {
	if VERBOSE_DEBUG {
		fmt.Printf(format+"\n", args...)
	}
}
