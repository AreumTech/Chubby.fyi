#!/bin/bash
# WASM Boundary Enforcement Script
#
# This script ensures that ALL WASM calls go through wasmBridge.ts
# It fails CI if any direct (window as any).run* or (window as any).go* calls exist
# outside of the allowed files.
#
# See: docs/WASM_BRIDGE_MIGRATION.md

set -e

echo "🔍 Checking WASM boundary integrity..."

# Allowed files that CAN access window.* WASM functions
# Only infrastructure files that MUST call WASM directly
ALLOWED_FILES=(
  "wasmBridge.ts"              # Canonical bridge
  "wasmMainThreadLoader.ts"    # WASM initialization
  "wasmSimulation.ts"          # Simulation runner infrastructure
  "wasmWorkerPool.ts"          # Worker pool infrastructure
  "fallbackSimulation.ts"      # JS fallback engine
  "logger.ts"                  # setSimulationVerbosity helper
)

# Build grep exclusion pattern
EXCLUDE_PATTERN=""
for file in "${ALLOWED_FILES[@]}"; do
  EXCLUDE_PATTERN="${EXCLUDE_PATTERN}|${file}"
done
EXCLUDE_PATTERN="${EXCLUDE_PATTERN:1}"  # Remove leading |

# Patterns that indicate direct WASM access
# These should ONLY appear in wasmBridge.ts
WASM_PATTERNS=(
  '(window as any)\.run'
  '(window as any)\.go[A-Z]'
  'window\.run[A-Z]'
  'window\.go[A-Z]'
)

VIOLATIONS=""

for pattern in "${WASM_PATTERNS[@]}"; do
  # Find violations, excluding allowed files
  MATCHES=$(grep -rn "$pattern" src \
    --include="*.ts" --include="*.tsx" \
    | grep -Ev "$EXCLUDE_PATTERN" \
    || true)

  if [ -n "$MATCHES" ]; then
    VIOLATIONS="${VIOLATIONS}${MATCHES}\n"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo ""
  echo "❌ WASM BOUNDARY VIOLATION DETECTED"
  echo "════════════════════════════════════════════════════════════════"
  echo ""
  echo "The following files contain direct WASM calls that should go through wasmBridge.ts:"
  echo ""
  echo -e "$VIOLATIONS"
  echo ""
  echo "FIX: Import and use wasmBridge instead:"
  echo ""
  echo "  import { wasmBridge } from '@/services/wasmBridge';"
  echo "  const result = await wasmBridge.runDeterministicSimulation(...);"
  echo ""
  echo "See: docs/WASM_BRIDGE_MIGRATION.md"
  echo "════════════════════════════════════════════════════════════════"
  exit 1
fi

echo "✅ WASM boundary clean - all calls go through wasmBridge.ts"
