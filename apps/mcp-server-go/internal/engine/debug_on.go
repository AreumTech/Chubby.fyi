//go:build debug

package engine

import "fmt"

// VERBOSE_DEBUG controls debug output — enabled via -tags debug
const VERBOSE_DEBUG = true

// DebugPrintf prints debug messages when VERBOSE_DEBUG is enabled
func DebugPrintf(format string, args ...interface{}) {
	if VERBOSE_DEBUG {
		fmt.Printf(format, args...)
	}
}
