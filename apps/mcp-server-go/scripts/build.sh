#!/bin/bash
# Build script for AreumFire MCP Server (Go)

set -e

cd "$(dirname "$0")/.."

echo "Building AreumFire MCP Server..."

PGO_FLAG=""
if [ -f "default.pgo" ]; then
    echo "Using Profile-Guided Optimization (default.pgo found)"
    PGO_FLAG="-pgo=default.pgo"
fi

# Build for current platform
go build -v $PGO_FLAG -o server ./cmd/server

echo "Build complete: ./server"
echo ""
echo "Run with: ./server"
echo "Or with custom port: PORT=3000 ./server"
