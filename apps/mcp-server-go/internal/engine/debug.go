package engine

import (
	"fmt"
	"os"
)

// VERBOSE_DEBUG controls debug output
var VERBOSE_DEBUG = os.Getenv("VERBOSE_DEBUG") == "true"

// DebugPrintf prints debug messages when VERBOSE_DEBUG is enabled
func DebugPrintf(format string, args ...interface{}) {
	if VERBOSE_DEBUG {
		fmt.Printf(format, args...)
	}
}
