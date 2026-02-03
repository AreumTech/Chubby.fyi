#!/bin/bash

# Run Go tests without WASM build constraints
# This allows testing the financial logic without the WASM environment

echo "Running Go tests for PathFinder WASM module..."

# Set environment to run tests without WASM constraints
export GOOS=linux
export GOARCH=amd64

# Run tests with verbose output
go test -v ./... -tags=!wasm,!js

# Check test result
if [ $? -eq 0 ]; then
    echo "✅ All Go tests passed!"
else
    echo "❌ Some Go tests failed!"
    exit 1
fi