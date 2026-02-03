#!/bin/bash
# Build script for AreumFire MCP Server (Go)

set -e

cd "$(dirname "$0")/.."

echo "Building AreumFire MCP Server..."

# Build for current platform
go build -v -o server ./cmd/server

echo "Build complete: ./server"
echo ""
echo "Run with: ./server"
echo "Or with custom port: PORT=3000 ./server"
