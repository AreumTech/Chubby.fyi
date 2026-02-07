#!/bin/bash
# Deploy/update Chubby MCP Server to Hetzner VPS
#
# Usage:
#   ./deploy/hetzner/scripts/deploy.sh <server-ip> [--node]
#
# Examples:
#   ./deploy/hetzner/scripts/deploy.sh 1.2.3.4          # Deploy Go binary (default)
#   ./deploy/hetzner/scripts/deploy.sh 1.2.3.4 --node   # Deploy Node.js server
#
# Prerequisites:
#   - setup.sh has been run on the VPS
#   - Go 1.22+ installed locally (for Go deploy)
#   - SSH key configured for root@VPS

set -euo pipefail

SERVER_IP="${1:?Usage: deploy.sh <server-ip> [--node]}"
MODE="${2:-go}"
SSH_USER="root"
REMOTE_DIR="/opt/chubby"

echo "=== Deploying Chubby MCP Server to ${SERVER_IP} ==="

if [ "$MODE" = "--node" ]; then
    echo "--- Mode: Node.js ---"

    # Build MCP server locally
    echo "Building Node.js MCP server..."
    cd apps/mcp-server
    npm ci
    npm run build
    cd ../..

    # Upload Node.js server
    echo "Uploading to ${SERVER_IP}..."
    ssh ${SSH_USER}@${SERVER_IP} "mkdir -p ${REMOTE_DIR}/node"
    rsync -avz --delete \
        apps/mcp-server/dist/ \
        ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/node/dist/
    rsync -avz --delete \
        apps/mcp-server/public/ \
        ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/node/public/
    scp apps/mcp-server/package.json ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/node/

    # Install production deps on server
    ssh ${SSH_USER}@${SERVER_IP} "cd ${REMOTE_DIR}/node && npm ci --production"

else
    echo "--- Mode: Go binary ---"

    # Detect target architecture
    REMOTE_ARCH=$(ssh ${SSH_USER}@${SERVER_IP} "uname -m")
    case "$REMOTE_ARCH" in
        x86_64)  GOARCH="amd64" ;;
        aarch64) GOARCH="arm64" ;;
        *)       echo "Unknown arch: $REMOTE_ARCH"; exit 1 ;;
    esac
    echo "Target: linux/${GOARCH}"

    # Cross-compile Go binary
    echo "Building Go binary..."
    cd apps/mcp-server-go

    PGO_FLAG=""
    if [ -f "default.pgo" ]; then
        echo "Using PGO profile"
        PGO_FLAG="-pgo=default.pgo"
    fi

    CGO_ENABLED=0 GOOS=linux GOARCH=${GOARCH} \
        go build -ldflags="-w -s" ${PGO_FLAG} -o server ./cmd/server

    cd ../..

    # Upload binary
    echo "Uploading to ${SERVER_IP}..."
    scp apps/mcp-server-go/server ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/server.new

    # Atomic swap + restart
    ssh ${SSH_USER}@${SERVER_IP} << 'REMOTE'
        set -e
        chown chubby:chubby /opt/chubby/server.new
        chmod +x /opt/chubby/server.new
        mv /opt/chubby/server.new /opt/chubby/server
REMOTE

    # Cleanup local build artifact
    rm -f apps/mcp-server-go/server
fi

# Upload nginx config
echo "Uploading nginx config..."
scp deploy/hetzner/nginx/api.chubby.fyi.conf \
    ${SSH_USER}@${SERVER_IP}:/etc/nginx/sites-available/api.chubby.fyi

# Upload systemd service
echo "Uploading systemd service..."
scp deploy/hetzner/systemd/chubby-mcp.service \
    ${SSH_USER}@${SERVER_IP}:/etc/systemd/system/chubby-mcp.service

# Reload and restart
echo "Restarting services..."
ssh ${SSH_USER}@${SERVER_IP} << 'REMOTE'
    set -e
    nginx -t && systemctl reload nginx
    systemctl daemon-reload
    systemctl enable chubby-mcp
    systemctl restart chubby-mcp
    sleep 2
    systemctl status chubby-mcp --no-pager
    echo ""
    echo "Health check:"
    curl -s http://127.0.0.1:8080/health | jq .
REMOTE

echo ""
echo "=== Deploy complete ==="
echo "Test: curl -s https://api.chubby.fyi/health | jq ."
