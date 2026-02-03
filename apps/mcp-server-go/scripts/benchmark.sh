#!/bin/bash
# Benchmark script for Native Go simulation engine
# Compares performance against WASM baseline

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$(dirname "$PROJECT_DIR")")"

echo "========================================"
echo "AreumFire Simulation Benchmark Suite"
echo "========================================"
echo ""

cd "$PROJECT_DIR"

# Run Go benchmarks
echo "Running Native Go Benchmarks..."
echo "--------------------------------"
go test -bench=. -benchmem ./internal/simulation/ 2>&1 | tee /tmp/go-bench.txt

echo ""
echo "Native Go Benchmark Summary:"
echo "----------------------------"
grep "Benchmark" /tmp/go-bench.txt || echo "No benchmark results found"

echo ""
echo "Running detailed performance report..."
echo "--------------------------------------"
go test -v -run TestPerformanceReport ./internal/simulation/ 2>&1 | grep -A 50 "Performance Report" || true

# If WASM benchmarks exist, run them too
if [ -f "$ROOT_DIR/wasm/simulation_test.go" ]; then
    echo ""
    echo "Running WASM Go Benchmarks (for comparison)..."
    echo "-----------------------------------------------"
    cd "$ROOT_DIR/wasm"
    go test -bench=BenchmarkSimulation -benchmem . 2>&1 | head -20 || echo "WASM benchmarks not available"
    cd "$PROJECT_DIR"
fi

echo ""
echo "========================================"
echo "Benchmark Complete"
echo "========================================"
