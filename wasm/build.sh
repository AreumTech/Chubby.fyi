#!/bin/bash

# Build Go to WebAssembly
# Usage: 
#   ./build.sh           # Development build with debug logs
#   ./build.sh prod      # Production build without debug logs

MODE=${1:-dev}

echo "Building PathFinder Pro simulation engine to WebAssembly..."

# Check if Go is installed
if ! command -v go &> /dev/null; then
    echo "Error: Go is not installed or not in PATH"
    echo "Please install Go from https://golang.org/dl/"
    exit 1
fi

PGO_FLAG=""
if [ -f "default.pgo" ]; then
    echo "Using Profile-Guided Optimization (default.pgo found)"
    PGO_FLAG="-pgo=default.pgo"
fi

if [ "$MODE" = "prod" ] || [ "$MODE" = "production" ]; then
    echo "Building PRODUCTION mode (no debug logs)..."
    # Production build with safe optimizations:
    # -tags production: Use production build tags (no debug logs, VERBOSE_DEBUG=false)
    # -ldflags="-s -w": Strip debug info and symbol table
    # -trimpath: Remove file paths from binary
    if GOOS=js GOARCH=wasm go build \
        -tags "wasm production" \
        -trimpath \
        -ldflags="-s -w" \
        $PGO_FLAG \
        -o pathfinder.wasm .; then
        echo "✓ PRODUCTION build successful"
    else
        echo "✗ Go compilation failed"
        exit 1
    fi
else
    echo "Building DEVELOPMENT mode (with debug logs)..."
    # Development build - keep debug info for easier debugging
    if GOOS=js GOARCH=wasm go build \
        -tags wasm \
        $PGO_FLAG \
        -o pathfinder.wasm .; then
        echo "✓ DEVELOPMENT build successful"
    else
        echo "✗ Go compilation failed"
        exit 1
    fi
fi

# EXTREME: Compress WASM with brotli if available
if command -v brotli &> /dev/null; then
    echo "Compressing WASM with brotli..."
    brotli -f -q 11 pathfinder.wasm
    echo "✓ WASM compressed: $(ls -lah pathfinder.wasm.br | awk '{print $5}')"
fi

# Use the committed local copy of wasm_exec.js (no external dependencies)
if [ -f "wasm_exec.js" ]; then
    echo "✓ Using local wasm_exec.js (committed to repository)"
else
    echo "✗ wasm_exec.js not found in wasm directory"
    echo "This file should be committed to the repository to avoid external dependencies"
    exit 1
fi

echo ""
echo "Build complete: pathfinder.wasm and wasm_exec.js generated"

# Copy to public directory for dev server
if [ -d "../public" ]; then
    echo "Copying WASM files to public directory..."
    cp pathfinder.wasm ../public/
    cp pathfinder.wasm.br ../public/ 2>/dev/null || true
    cp wasm_exec.js ../public/ 2>/dev/null || true
    echo "✓ WASM files copied to public/"
else
    echo "⚠️  Warning: ../public directory not found, WASM not copied"
fi

echo "Files ready for integration with React application"
