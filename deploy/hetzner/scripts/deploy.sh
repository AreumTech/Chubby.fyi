#!/bin/bash
# Deploy/update Chubby MCP Server to Hetzner VPS
#
# Usage:
#   ./deploy/hetzner/scripts/deploy.sh <server-ip>
#
# Example:
#   ./deploy/hetzner/scripts/deploy.sh 1.2.3.4
#
# Deploys:
#   - Node.js MCP server (apps/mcp-server) on port 8080
#   - Simulation service (services/simulation-service) with WASM on port 3002
#
# Prerequisites:
#   - setup.sh has been run on the VPS
#   - Node.js 18+ installed on VPS
#   - SSH key configured for chubby@VPS
#   - WASM built locally (npm run build:wasm)

set -euo pipefail

SERVER_IP="${1:?Usage: deploy.sh <server-ip>}"
SSH_USER="chubby"
REMOTE_DIR="/opt/chubby"

echo "=== Deploying Chubby MCP Server to ${SERVER_IP} ==="

# Build MCP server locally
echo "Building Node.js MCP server..."
cd apps/mcp-server
npm run build
npm prune --omit=dev
cd ../..

# Verify WASM exists
if [ ! -f "public/pathfinder.wasm" ]; then
    echo "ERROR: public/pathfinder.wasm not found. Run 'npm run build:wasm' first."
    exit 1
fi

# Package everything
echo "Packaging..."
tar czf /tmp/chubby-deploy.tar.gz \
    apps/mcp-server/dist/ \
    apps/mcp-server/public/ \
    apps/mcp-server/package.json \
    apps/mcp-server/node_modules/ \
    services/simulation-service/src/ \
    services/simulation-service/package.json \
    services/simulation-service/node_modules/ \
    services/simulation-service/wasm_exec.js \
    public/pathfinder.wasm \
    public/wasm_exec.js \
    public/config/

# Upload and extract
echo "Uploading to ${SERVER_IP}..."
scp /tmp/chubby-deploy.tar.gz ${SSH_USER}@${SERVER_IP}:${REMOTE_DIR}/
ssh ${SSH_USER}@${SERVER_IP} "cd ${REMOTE_DIR} && tar xzf chubby-deploy.tar.gz && rm chubby-deploy.tar.gz"
rm /tmp/chubby-deploy.tar.gz

# Upload systemd services
echo "Uploading systemd services..."
scp deploy/hetzner/systemd/chubby-sim.service ${SSH_USER}@${SERVER_IP}:/tmp/
scp deploy/hetzner/systemd/chubby-mcp.service ${SSH_USER}@${SERVER_IP}:/tmp/
ssh ${SSH_USER}@${SERVER_IP} "sudo mv /tmp/chubby-sim.service /tmp/chubby-mcp.service /etc/systemd/system/"

# Upload nginx config
echo "Uploading nginx config..."
scp deploy/hetzner/nginx/api.chubby.fyi.conf ${SSH_USER}@${SERVER_IP}:/tmp/
ssh ${SSH_USER}@${SERVER_IP} "sudo mv /tmp/api.chubby.fyi.conf /etc/nginx/sites-available/api.chubby.fyi"

# Reload and restart
echo "Restarting services..."
ssh ${SSH_USER}@${SERVER_IP} << 'REMOTE'
    set -e
    sudo nginx -t && sudo systemctl reload nginx
    sudo systemctl daemon-reload
    sudo systemctl enable chubby-sim chubby-mcp
    sudo systemctl restart chubby-sim
    sleep 2
    sudo systemctl restart chubby-mcp
    sleep 2
    echo "sim:  $(systemctl is-active chubby-sim)"
    echo "mcp:  $(systemctl is-active chubby-mcp)"
    echo ""
    echo "Health checks:"
    curl -s http://localhost:3002/health | head -c 100
    echo ""
    curl -s http://localhost:8080/
    echo ""
REMOTE

echo ""
echo "=== Deploy complete ==="
echo "Test: curl -s https://api.chubby.fyi/ | python3 -m json.tool"
