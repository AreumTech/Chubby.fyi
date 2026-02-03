//go:build js && wasm
// +build js,wasm

package main

import (
	"fmt"
	"syscall/js"
)

// debugLog logs a message to the browser console (WASM environment only)
// Now controlled by VERBOSE_DEBUG flag from simulation.go
func debugLog(message string) {
	// Check global debug flag - if false, don't log
	if !VERBOSE_DEBUG {
		return
	}

	// Use safe console logging with panic recovery
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures
		}
	}()
	js.Global().Get("console").Call("log", message)
}

// debugError logs an error message to the browser console (WASM environment only)
func debugError(message string) {
	js.Global().Get("console").Call("error", message)
}

// debugLogf logs a formatted message to the browser console (WASM environment only)
func debugLogf(format string, args ...interface{}) {
	// Check global debug flag - if false, don't log
	if !VERBOSE_DEBUG {
		return
	}

	// Use safe console logging with panic recovery
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures to prevent simulation crash
		}
	}()

	message := fmt.Sprintf(format, args...)
	js.Global().Get("console").Call("log", message)
}

// debugErrorf logs a formatted error message to the browser console (WASM environment only)
func debugErrorf(format string, args ...interface{}) {
	// TEMPORARY: Completely disable all JavaScript interop to prevent WASM crashes
	return

	// CRITICAL FIX: Add safety checks to prevent WASM exports crash
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures to prevent simulation crash
		}
	}()

	// Check if we can safely access JavaScript
	if js.Global().Truthy() {
		console := js.Global().Get("console")
		if console.Truthy() {
			message := fmt.Sprintf(format, args...)
			console.Call("error", message)
		}
	}
}

// Simulation verbosity-aware logging functions
// These respect both VERBOSE_DEBUG and SIMULATION_VERBOSITY

// simLogVerbose logs a message only at SIMULATION_VERBOSITY level 0 (VERBOSE)
func simLogVerbose(format string, args ...interface{}) {
	if !VERBOSE_DEBUG || SIMULATION_VERBOSITY > 0 {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures
		}
	}()
	message := fmt.Sprintf(format, args...)
	js.Global().Get("console").Call("log", message)
}

// simLogEvent logs a message at SIMULATION_VERBOSITY level 1 (EVENT) or lower
func simLogEvent(format string, args ...interface{}) {
	if !VERBOSE_DEBUG || SIMULATION_VERBOSITY > 1 {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures
		}
	}()
	message := fmt.Sprintf(format, args...)
	js.Global().Get("console").Call("log", message)
}

// simLogMonthly logs a message at SIMULATION_VERBOSITY level 2 (MONTHLY) or lower
func simLogMonthly(format string, args ...interface{}) {
	if !VERBOSE_DEBUG || SIMULATION_VERBOSITY > 2 {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures
		}
	}()
	message := fmt.Sprintf(format, args...)
	js.Global().Get("console").Call("log", message)
}

// simLogPath logs a message at SIMULATION_VERBOSITY level 3 (PATH) or lower (always shown in dev)
func simLogPath(format string, args ...interface{}) {
	if !VERBOSE_DEBUG {
		return
	}
	defer func() {
		if r := recover(); r != nil {
			// Silently ignore JavaScript interop failures
		}
	}()
	message := fmt.Sprintf(format, args...)
	js.Global().Get("console").Call("log", message)
}

// setSimulationVerbosityJS allows JavaScript to change SIMULATION_VERBOSITY at runtime
func setSimulationVerbosityJS(this js.Value, args []js.Value) interface{} {
	if len(args) < 1 {
		return map[string]interface{}{
			"success": false,
			"error":   "Missing verbosity level argument (0-3)",
		}
	}

	level := args[0].Int()
	if level < 0 || level > 3 {
		return map[string]interface{}{
			"success": false,
			"error":   fmt.Sprintf("Invalid verbosity level %d. Must be 0-3", level),
		}
	}

	SIMULATION_VERBOSITY = level

	levelNames := map[int]string{
		0: "VERBOSE (full debug output)",
		1: "EVENT (one line per event)",
		2: "MONTHLY (monthly summaries)",
		3: "PATH (path summaries only)",
	}

	return map[string]interface{}{
		"success": true,
		"level":   level,
		"message": fmt.Sprintf("Simulation verbosity set to level %d: %s", level, levelNames[level]),
	}
}

// getSimulationVerbosityJS returns the current SIMULATION_VERBOSITY level
func getSimulationVerbosityJS(this js.Value, args []js.Value) interface{} {
	levelNames := map[int]string{
		0: "VERBOSE",
		1: "EVENT",
		2: "MONTHLY",
		3: "PATH",
	}

	return map[string]interface{}{
		"level":       SIMULATION_VERBOSITY,
		"name":        levelNames[SIMULATION_VERBOSITY],
		"verboseDebug": VERBOSE_DEBUG,
	}
}
