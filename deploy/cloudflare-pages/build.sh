#!/bin/bash
# Cloudflare Pages build script
#
# CF Pages dashboard settings:
#   Build command:    bash deploy/cloudflare-pages/build.sh
#   Output directory: chubby-site
#   Environment variables: (none needed)
#
# Custom domains (add in CF Pages dashboard):
#   chubby.fyi        → primary site
#   widget.chubby.fyi → viewer (same deploy, just an alias)

set -euo pipefail

echo "=== Cloudflare Pages Build ==="

# chubby-site/ is already a complete static site — just copy extras into it

# 1) Copy viewer + widget files so widget.chubby.fyi/viewer works
cp apps/mcp-server/public/viewer.html chubby-site/
cp apps/mcp-server/public/simulation-widget.html chubby-site/
cp apps/mcp-server/public/pako.min.js chubby-site/

# 2) Copy CF Pages routing files
cp deploy/cloudflare-pages/_headers chubby-site/
cp deploy/cloudflare-pages/_redirects chubby-site/

echo "=== Build complete. Output in chubby-site/ ==="
ls -lh chubby-site/
