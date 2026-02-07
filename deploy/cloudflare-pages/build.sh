#!/bin/bash
# Cloudflare Pages build script
#
# CF Pages dashboard settings:
#   Build command:    bash deploy/cloudflare-pages/build.sh
#   Output directory: dist
#   Environment variables:
#     NODE_VERSION=20
#     GO_VERSION=1.22
#
# Custom domains (add in CF Pages dashboard):
#   chubby.fyi        → primary SPA
#   widget.chubby.fyi → viewer (same deploy, just an alias)

set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# 1) Install deps
npm ci

# 2) Build SPA (includes WASM compilation + Vite build)
npm run build

# 3) Copy viewer files into dist/ so widget.chubby.fyi/viewer works
cp apps/mcp-server/public/viewer.html dist/
cp apps/mcp-server/public/pako.min.js dist/

# 4) Copy CF Pages routing files into dist/
cp deploy/cloudflare-pages/_headers dist/
cp deploy/cloudflare-pages/_redirects dist/

echo "=== Build complete. Output in dist/ ==="
ls -lh dist/
