//go:build !js || !wasm
// +build !js !wasm

package main

import (
	"fmt"
)

// debugLog logs a message to stdout (native Go environment)
func debugLog(message string) {
	fmt.Println("[DEBUG]", message)
}

// debugError logs an error message to stdout (native Go environment)
func debugError(message string) {
	fmt.Println("[ERROR]", message)
}

// debugLogf logs a formatted message to stdout (native Go environment)
func debugLogf(format string, args ...interface{}) {
	fmt.Printf("[DEBUG] "+format+"\n", args...)
}

// debugErrorf logs a formatted error message to stdout (native Go environment)
func debugErrorf(format string, args ...interface{}) {
	fmt.Printf("[ERROR] "+format+"\n", args...)
}

// simLogVerbose is a stub for non-WASM builds
func simLogVerbose(format string, args ...interface{}) {
	if VERBOSE_DEBUG && SIMULATION_VERBOSITY == 0 {
		fmt.Printf("[SIM-VERBOSE] "+format+"\n", args...)
	}
}

// simLogEvent is a stub for non-WASM builds
func simLogEvent(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 1 {
		fmt.Printf("[SIM-EVENT] "+format+"\n", args...)
	}
}

// simLogMonthly is a stub for non-WASM builds
func simLogMonthly(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 2 {
		fmt.Printf("[SIM-MONTHLY] "+format+"\n", args...)
	}
}

// simLogPath is a stub for non-WASM builds
func simLogPath(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 3 {
		fmt.Printf("[SIM-PATH] "+format+"\n", args...)
	}
}
