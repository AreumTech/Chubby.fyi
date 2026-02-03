//go:build !js || !wasm
// +build !js !wasm

package main

import (
	"os"
)

// Main function for non-WASM builds (CLI usage)
func main() {
	if len(os.Args) > 1 && os.Args[1] == "backtest" {
		// Remove "backtest" from args and shift everything left
		os.Args = append(os.Args[:1], os.Args[2:]...)
		runBacktestMain()
		return
	}

	// Default behavior for other CLI commands can be added here
	// For now, just run backtest help
	runBacktestMain()
}
