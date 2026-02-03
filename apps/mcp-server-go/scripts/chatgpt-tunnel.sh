#!/bin/bash
# ChatGPT Testing Server (Go)
#
# Starts the Go MCP server and optionally creates an ngrok tunnel.
#
# Usage:
#   ./scripts/chatgpt-tunnel.sh          # Local only
#   ./scripts/chatgpt-tunnel.sh --tunnel # With ngrok tunnel for ChatGPT access

set -e

cd "$(dirname "$0")/.."

PORT=${PORT:-8000}
USE_TUNNEL=false

# Parse args
for arg in "$@"; do
  case $arg in
    --tunnel)
      USE_TUNNEL=true
      shift
      ;;
  esac
done

# Colors
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m' # No Color

echo -e "\n${BLUE}══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  AreumFire MCP Server (Go) - ChatGPT Testing${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════${NC}\n"

# Build if needed
if [ ! -f "./server" ] || [ "./cmd/server/main.go" -nt "./server" ]; then
  echo -e "${GREEN}[BUILD]${NC} Building server..."
  go build -o server ./cmd/server
fi

# Start server
echo -e "${GREEN}[SERVER]${NC} Starting MCP server on port ${PORT}..."
PORT=$PORT ./server &
SERVER_PID=$!

# Wait for server to be ready
sleep 1

# Check if server started
if ! kill -0 $SERVER_PID 2>/dev/null; then
  echo -e "${YELLOW}[ERROR]${NC} Server failed to start"
  exit 1
fi

TUNNEL_URL=""

if [ "$USE_TUNNEL" = true ]; then
  echo -e "${CYAN}[TUNNEL]${NC} Starting ngrok tunnel to port ${PORT}..."

  # Start ngrok in background and capture URL
  ngrok http $PORT --log=stdout > /tmp/ngrok.log 2>&1 &
  NGROK_PID=$!

  # Wait for tunnel to be ready and extract URL
  for i in {1..10}; do
    sleep 1
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)
    if [ -n "$TUNNEL_URL" ]; then
      break
    fi
  done

  if [ -z "$TUNNEL_URL" ]; then
    echo -e "${YELLOW}[TUNNEL]${NC} Failed to get tunnel URL. Check ngrok installation."
  fi
fi

# Print summary
echo -e "\n${GREEN}✓ Services running:${NC}"
echo -e "  ${CYAN}MCP Endpoint:${NC}    http://localhost:${PORT}/mcp"
echo -e "  ${CYAN}Widget Test:${NC}     http://localhost:${PORT}/test"
echo -e "  ${CYAN}Health Check:${NC}    http://localhost:${PORT}/health"

if [ -n "$TUNNEL_URL" ]; then
  echo -e "\n  ${CYAN}Public URL:${NC}      ${TUNNEL_URL}"
  echo -e "\n  ${YELLOW}ChatGPT App Configuration:${NC}"
  echo -e "  ${GREEN}Server URL:${NC} ${TUNNEL_URL}/mcp"
elif [ "$USE_TUNNEL" = true ]; then
  echo -e "\n  ${YELLOW}Tunnel failed to start. Install ngrok: brew install ngrok${NC}"
fi

echo -e "\n${DIM}Press Ctrl+C to stop all services${NC}\n"

# Cleanup on exit
cleanup() {
  echo -e "\n\nShutting down..."
  kill $SERVER_PID 2>/dev/null || true
  [ -n "$NGROK_PID" ] && kill $NGROK_PID 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM

# Keep alive
wait $SERVER_PID
