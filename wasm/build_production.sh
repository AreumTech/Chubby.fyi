#!/bin/bash

# Build WASM for production with debug logs stripped
echo "Building production WASM (no debug logs)..."

# Create a temporary directory for build
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Copy all Go files to temp directory
cp *.go "$TEMP_DIR/"

# Remove all debug print statements from the copies
echo "Stripping debug statements..."
for file in "$TEMP_DIR"/*.go; do
    # Comment out all fmt.Print statements (keep fmt.Sprintf as it's used for formatting)
    sed -i 's/^\s*fmt\.Print/\/\/ fmt.Print/g' "$file"
    
    # Remove debug log lines that start with specific patterns
    sed -i '/^\s*\/\/ DEBUG:/d' "$file"
    sed -i '/WASM-BINDING DEBUG:/d' "$file"
    sed -i '/\[WASM-DEBUG\]/d' "$file"
done

# Build WASM from the cleaned files
cd "$TEMP_DIR"
GOOS=js GOARCH=wasm go build -ldflags="-s -w" -o pathfinder.wasm .

# Copy the production WASM back
cp pathfinder.wasm ../pathfinder.production.wasm

# Clean up
cd ..
rm -rf "$TEMP_DIR"

echo "Production WASM built: pathfinder.production.wasm"
echo "Size: $(ls -lh pathfinder.production.wasm | awk '{print $5}')"
echo ""
echo "To use production build:"
echo "  cp pathfinder.production.wasm ../public/pathfinder.wasm"