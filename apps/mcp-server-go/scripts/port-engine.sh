#!/bin/bash
# Port simulation engine from wasm/ to native Go
# This script copies core simulation files and adapts them for the native server

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
WASM_DIR="/home/xjhc/pro/areumFire/wasm"
ENGINE_DIR="$PROJECT_DIR/internal/engine"

echo "Porting simulation engine from wasm/ to native Go..."
echo "Source: $WASM_DIR"
echo "Target: $ENGINE_DIR"

# Create engine directory
mkdir -p "$ENGINE_DIR"

# Files to exclude (WASM-specific or not needed)
EXCLUDE_FILES=(
    "main.go"
    "main_cli.go"
    "wasm_bindings.go"
    "js_retain.go"
    "lightweight_serializer.go"
    "debug_wasm.go"
    "backtest_cli.go"
    "run_tests.go"
    "run_tests_native.go"
    "ledger_verification.go"
    "test_accelerator_basic.go"
    "test_accelerator_wasm_simple.go"
    "config_embedded.go"
)

# Build exclude pattern
EXCLUDE_PATTERN=""
for f in "${EXCLUDE_FILES[@]}"; do
    EXCLUDE_PATTERN="$EXCLUDE_PATTERN -not -name $f"
done

# Copy all non-test Go files except excluded ones
echo "Copying core simulation files..."
find "$WASM_DIR" -maxdepth 1 -name "*.go" -not -name "*_test.go" $EXCLUDE_PATTERN -exec cp {} "$ENGINE_DIR/" \;

# Count copied files
COPIED=$(ls "$ENGINE_DIR"/*.go 2>/dev/null | wc -l)
echo "Copied $COPIED files"

# Change package from "main" to "engine"
echo "Updating package declarations..."
for f in "$ENGINE_DIR"/*.go; do
    # Replace package main with package engine
    sed -i 's/^package main$/package engine/' "$f"

    # Remove WASM build tags
    sed -i '/^\/\/go:build.*wasm/d' "$f"
    sed -i '/^\/\/ +build.*wasm/d' "$f"
    sed -i '/^\/\/go:build.*js/d' "$f"
    sed -i '/^\/\/ +build.*js/d' "$f"

    # Remove !test build tags (we want tests to work)
    sed -i '/^\/\/go:build !test/d' "$f"
    sed -i '/^\/\/ +build !test/d' "$f"
done

# Remove debug files with conflicting build tags
rm -f "$ENGINE_DIR/debug_native.go"
rm -f "$ENGINE_DIR/debug_production.go"
rm -f "$ENGINE_DIR/verbose_debug_dev.go"
rm -f "$ENGINE_DIR/verbose_debug_prod.go"

# Create a simple debug.go without build tags
cat > "$ENGINE_DIR/debug.go" << 'EOF'
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
EOF

# Create verbose logging stubs
cat > "$ENGINE_DIR/verbose_logging.go" << 'EOF'
package engine

// Simulation verbosity level (0=verbose, 1=event, 2=monthly, 3=path)
var SIMULATION_VERBOSITY = 3

func simLogVerbose(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 0 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogEvent(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 1 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogMonthly(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 2 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLogPath(format string, args ...interface{}) {
	if SIMULATION_VERBOSITY <= 3 {
		DebugPrintf(format+"\n", args...)
	}
}

func simLog(format string, args ...interface{}) {
	DebugPrintf(format+"\n", args...)
}
EOF

echo "Engine ported successfully!"
echo ""
echo "Next steps:"
echo "1. cd $ENGINE_DIR"
echo "2. go build ./... to check for errors"
echo "3. Fix any compilation issues"
echo "4. Create adapter in internal/simulation/ to use the engine"
