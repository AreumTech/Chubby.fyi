#!/bin/bash
# Docker build script for AreumFire MCP Server

set -e

cd "$(dirname "$0")/.."

IMAGE_NAME="areumfire-mcp-server"
TAG="${1:-latest}"

echo "Building Docker image: ${IMAGE_NAME}:${TAG}"

docker build -t "${IMAGE_NAME}:${TAG}" .

echo ""
echo "Build complete: ${IMAGE_NAME}:${TAG}"
echo ""
echo "Run locally with:"
echo "  docker run -p 8080:8080 ${IMAGE_NAME}:${TAG}"
echo ""
echo "Deploy to Cloudflare Containers with:"
echo "  wrangler containers deploy"
